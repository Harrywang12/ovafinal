import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { AI_CONFIG } from "./ai-config";
import { recordQuizGenerationOutcome } from "./ai-telemetry";
import {
  acceptBlueprint,
  blueprintConceptKey,
  getActiveBlueprintFingerprints,
  rankBlueprintCandidates,
  releaseBlueprint,
  reserveBlueprint,
  type QuizBlueprint,
} from "./quiz-blueprint-planner";
import {
  generatedQuizQuestionSchema,
  shuffleQuestionOptions,
  validateGeneratedQuestion,
  type GeneratedQuizQuestion,
} from "./generated-quiz-question";
import { llmObject } from "./llm";
import { RateLimitError, RateLimitUnavailableError } from "./rate-limit";
import { assessQuizQuestionNovelty, getRecentStructuredQuizHistory, type StructuredQuizHistory } from "./quiz-question-history";
import { styleInstruction } from "./quiz-question-styles";
import { searchRuleChunks } from "./rag";
import type { QuizDifficulty, QuizDiscipline, RefereeLevel } from "./quiz-programs";
import type { RuleSet } from "./rule-source-classification";

export class QuizGenerationError extends Error {
  constructor(public code: string, message: string, public status = 422) {
    super(message);
  }
}

export type QuizGenerationFlow = "adaptive" | "program" | "module";

export type GenerateQuestionInput = {
  supabase: SupabaseClient;
  userId: string;
  discipline: QuizDiscipline;
  refereeLevel: RefereeLevel;
  difficulty: QuizDifficulty;
  topic: string;
  flow?: QuizGenerationFlow;
  moduleId?: string | null;
  quizSessionId?: string | null;
  rulesets?: RuleSet[];
  sourceQuery?: string;
  requireSourceTopic?: boolean;
  maxAttempts?: number;
  blueprint?: QuizBlueprint;
};

const generatedLanguageSchema = z.object({
  question: z.string().trim().min(1),
  options: z.tuple([
    z.string().trim().min(1), z.string().trim().min(1),
    z.string().trim().min(1), z.string().trim().min(1),
  ]),
  correctOptionIndex: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(1),
  supportingQuote: z.string().trim().min(20),
}).superRefine((value, ctx) => {
  if (new Set(value.options.map((option) => option.toLowerCase())).size !== 4) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["options"], message: "Options must be unique" });
  }
});

const verificationSchema = z.object({
  supported: z.boolean(),
  answerSupported: z.boolean(),
  explanationSupported: z.boolean(),
  failureCode: z.enum(["ANSWER_NOT_ENTAILED", "EXPLANATION_NOT_ENTAILED", "SOURCE_MISMATCH", "AMBIGUOUS_ANSWER"]).optional(),
});

function scopeFor(input: GenerateQuestionInput) {
  const flow = input.flow || (input.quizSessionId ? "program" : "adaptive");
  return { flow, scope: flow === "program" ? "program" : flow === "module" ? "module" : "adaptive" } as const;
}

function configuredRulesets(input: GenerateQuestionInput) {
  return input.rulesets || [input.discipline === "indoor" ? "standard_indoor" : "beach"] as RuleSet[];
}

function snake(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 64) || "rule_concept";
}

function levelGuidance(level: RefereeLevel) {
  if (level === "level_1") return "Use a fundamental rule and one clear application. Do not test authority beyond this level.";
  if (level === "level_2") return "Use realistic role-based application within Level 2 responsibilities.";
  return "Use realistic applied officiating judgment within the assigned referee level.";
}

function disciplineGuidance(discipline: QuizDiscipline, rulesets: RuleSet[]) {
  if (rulesets.some((value) => value.startsWith("rallyball"))) return "Use only the supplied Rallyball format and never import standard six-player or beach procedures.";
  return discipline === "indoor"
    ? "Use standard six-player Indoor rules only; never introduce Rallyball, Tripleball, or beach procedures."
    : "Use two-player Beach rules only; never introduce Indoor or Rallyball procedures.";
}

function generationMessages(input: GenerateQuestionInput, blueprint: QuizBlueprint) {
  return [
    {
      role: "system" as const,
      content: "Create one official-source-grounded volleyball referee multiple-choice question. Return JSON only with: question, exactly four unique options, correctOptionIndex (0-3), concise explanation, and supportingQuote. The quote must be copied exactly as one contiguous substring of the source. Use only the supplied source. Do not output metadata or citations. Exactly one option must be correct.",
    },
    {
      role: "user" as const,
      content: `Blueprint:\nquestionStyle=${blueprint.questionStyle}\nstyleInstruction=${styleInstruction(blueprint.questionStyle)}\nscenarioType=${blueprint.scenarioType}\nrefereeRole=${blueprint.refereeRole}\ndecisionType=${blueprint.decisionType}\ndifficulty=${input.difficulty}\n${levelGuidance(input.refereeLevel)}\n${disciplineGuidance(input.discipline, configuredRulesets(input))}\n\nOfficial source (the only authority):\n${blueprint.chunk.chunk_text.slice(0, 3_200)}`,
    },
  ];
}

function verificationMessages(question: GeneratedQuizQuestion, blueprint: QuizBlueprint) {
  return [
    {
      role: "system" as const,
      content: "Classify whether a multiple-choice question is fully entailed by the supplied official source. Return compact JSON only: supported, answerSupported, explanationSupported, and optional failureCode. supported is true only if the selected answer and explanation are both supported and exactly one option is correct.",
    },
    {
      role: "user" as const,
      content: `Official source:\n${blueprint.chunk.chunk_text}\n\nQuestion:\n${question.question}\nOptions:\n${question.options.map((option, index) => `${index}: ${option}`).join("\n")}\nSelected answer:\n${question.answer}\nExplanation:\n${question.explanation}\nSupporting quote:\n${question.sourceExcerpt}`,
    },
  ];
}

async function historyFor(input: GenerateQuestionInput) {
  const { scope } = scopeFor(input);
  return getRecentStructuredQuizHistory({
    supabase: input.supabase, userId: input.userId, scope,
    moduleId: input.moduleId || null, discipline: input.discipline, refereeLevel: input.refereeLevel,
  });
}

export async function planGroundedQuizBlueprint(
  input: GenerateQuestionInput,
  history?: StructuredQuizHistory[],
  locallyExcluded: Set<string> = new Set(),
  excludedConcepts: Set<string> = new Set()
): Promise<QuizBlueprint> {
  const { scope } = scopeFor(input);
  const retrievalTopic = input.requireSourceTopic === false ? undefined : input.topic;
  const filters = {
    discipline: input.discipline,
    refereeLevel: input.refereeLevel,
    topic: retrievalTopic,
    rulesets: configuredRulesets(input),
  };
  let chunks = await searchRuleChunks(input.sourceQuery || "", filters, AI_CONFIG.novelty.candidateChunkCount);
  if (!chunks.length && input.requireSourceTopic === false && input.sourceQuery) {
    chunks = await searchRuleChunks("", filters, AI_CONFIG.novelty.candidateChunkCount);
  }
  if (!chunks.length) throw new QuizGenerationError("INSUFFICIENT_SOURCE_CONTEXT", "No suitable official source material was found for this question.", 422);
  const [recentHistory, reserved] = await Promise.all([
    history ? Promise.resolve(history) : historyFor(input),
    getActiveBlueprintFingerprints(input.supabase, input.userId, scope),
  ]);
  for (const fingerprint of locallyExcluded) reserved.add(fingerprint);
  const candidates = rankBlueprintCandidates(chunks, input.topic, input.difficulty, recentHistory, reserved)
    .filter((candidate) => !excludedConcepts.has(blueprintConceptKey(candidate)));
  const result = await reserveBlueprint({
    supabase: input.supabase, userId: input.userId, scope,
    moduleId: input.moduleId, quizSessionId: input.quizSessionId,
    candidates, excludedFingerprints: locallyExcluded,
  });
  if (!result) throw new QuizGenerationError("BLUEPRINT_RESERVATION_CONFLICT", "No distinct question blueprint could be reserved.", 409);
  return result;
}

export async function planGroundedQuizBlueprints(
  base: Omit<GenerateQuestionInput, "topic" | "difficulty" | "blueprint">,
  requests: Array<{ topic: string; difficulty: QuizDifficulty; sourceQuery?: string }>
) {
  if (!requests.length) return [];
  const history = await historyFor({ ...base, ...requests[0] });
  const excluded = new Set<string>();
  const excludedConcepts = new Set<string>();
  const planned: QuizBlueprint[] = [];
  try {
    for (const request of requests) {
      const blueprint = await planGroundedQuizBlueprint({ ...base, ...request }, history, excluded, excludedConcepts);
      excluded.add(blueprint.fingerprint);
      excludedConcepts.add(blueprintConceptKey(blueprint));
      planned.push(blueprint);
    }
    return planned;
  } catch (error) {
    await Promise.all(planned.map((blueprint) => releaseBlueprint(base.supabase, blueprint.reservationId)));
    throw error;
  }
}

function assembleQuestion(input: GenerateQuestionInput, blueprint: QuizBlueprint, language: z.infer<typeof generatedLanguageSchema>) {
  const ruleReference = blueprint.chunk.rule_number
    ? `Rule ${blueprint.chunk.rule_number}${blueprint.chunk.section_title ? ` - ${blueprint.chunk.section_title}` : ""}`
    : blueprint.chunk.section_title || "Official rule source";
  return generatedQuizQuestionSchema.parse({
    question: language.question,
    options: language.options,
    answer: language.options[language.correctOptionIndex],
    explanation: language.explanation,
    ruleReference,
    discipline: input.discipline,
    refereeLevel: input.refereeLevel,
    difficulty: input.difficulty,
    topic: input.topic,
    subtopic: snake(`${input.topic}_${blueprint.ruleId}`),
    ruleId: blueprint.ruleId,
    scenarioType: blueprint.scenarioType,
    refereeRole: blueprint.refereeRole,
    decisionType: blueprint.decisionType,
    questionStyle: blueprint.questionStyle,
    sourceDocumentId: blueprint.chunk.document_id,
    sourceChunkIds: [blueprint.chunk.id],
    sourceExcerpt: language.supportingQuote,
    blueprintFingerprint: blueprint.fingerprint,
  });
}

export async function generateGroundedQuizQuestion(input: GenerateQuestionInput): Promise<GeneratedQuizQuestion> {
  const { flow, scope } = scopeFor(input);
  const attempts = Math.min(2, input.maxAttempts ?? AI_CONFIG.novelty.maxAttempts);
  const history = await historyFor(input);
  const attemptedFingerprints = new Set<string>();
  const attemptedConcepts = new Set<string>();
  let blueprint = input.blueprint;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    blueprint ||= await planGroundedQuizBlueprint(input, history, attemptedFingerprints, attemptedConcepts);
    attemptedFingerprints.add(blueprint.fingerprint);
    attemptedConcepts.add(blueprintConceptKey(blueprint));
    try {
      const language = await llmObject(generationMessages(input, blueprint), generatedLanguageSchema, "fast", {
        maxTokens: AI_CONFIG.outputTokens.quiz, timeoutMs: AI_CONFIG.timeoutMs,
        userId: input.userId, requestType: `quiz_generation:${flow}`, attempt,
      });
      const question = validateGeneratedQuestion(assembleQuestion(input, blueprint, language), {
        discipline: input.discipline, refereeLevel: input.refereeLevel, difficulty: input.difficulty,
        topic: input.topic, questionStyle: blueprint.questionStyle,
        requireSourceTopic: input.requireSourceTopic, rulesets: configuredRulesets(input),
      }, [blueprint.chunk]);
      const novelty = await assessQuizQuestionNovelty({
        supabase: input.supabase, userId: input.userId, scope,
        moduleId: input.moduleId || null, discipline: input.discipline, refereeLevel: input.refereeLevel,
        questionText: question.question, metadata: question,
      });
      if (novelty.duplicate) throw new Error(`DUPLICATE_${novelty.reason || "UNKNOWN"}`);
      const verification = await llmObject(verificationMessages(question, blueprint), verificationSchema, "fast", {
        maxTokens: AI_CONFIG.outputTokens.verifier, timeoutMs: 12_000,
        userId: input.userId, requestType: `quiz_verification:${flow}`, attempt,
      });
      if (!verification.supported || !verification.answerSupported || !verification.explanationSupported) {
        throw new Error(`GROUNDING_${verification.failureCode || "REJECTED"}`);
      }
      await acceptBlueprint(input.supabase, blueprint.reservationId);
      console.info("quiz_generation_outcome", {
        flow, attempt, outcome: "accepted", validation: "passed", duplicate: false,
        verifier: "supported", blueprintFingerprint: blueprint.fingerprint,
      });
      await recordQuizGenerationOutcome({
        userId: input.userId, flow, attempt, blueprintFingerprint: blueprint.fingerprint, outcome: "accepted",
      });
      return shuffleQuestionOptions(question);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown";
      const rejectionStage = reason.startsWith("DUPLICATE_")
        ? "duplicate" as const
        : reason.startsWith("GROUNDING_")
          ? "verification" as const
          : reason.includes("DeepSeek")
            ? "generation" as const
            : "validation" as const;
      console.info("quiz_generation_outcome", {
        flow, attempt, outcome: "rejected",
        reason,
        blueprintFingerprint: blueprint.fingerprint,
      });
      await recordQuizGenerationOutcome({
        userId: input.userId, flow, attempt, blueprintFingerprint: blueprint.fingerprint,
        outcome: "rejected", rejectionStage, rejectionReason: reason,
      });
      await releaseBlueprint(input.supabase, blueprint.reservationId);
      blueprint = undefined;
      if (error instanceof RateLimitError || error instanceof RateLimitUnavailableError) throw error;
    }
  }
  throw new QuizGenerationError("UNIQUE_QUESTION_GENERATION_FAILED", "A sufficiently distinct, source-supported question could not be generated.", 422);
}
