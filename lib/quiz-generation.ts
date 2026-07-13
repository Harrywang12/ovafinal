import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  generatedQuizQuestionSchema,
  questionStyleSchema,
  shuffleQuestionOptions,
  validateGeneratedQuestion,
  type GeneratedQuizQuestion,
  type QuestionStyle,
} from "./generated-quiz-question";
import { llmObject } from "./llm";
import {
  assessQuizQuestionNovelty,
  assessStructuredRepetition,
  getRecentStructuredQuizHistory,
  quizQuestionTextSimilarity,
  type StructuredQuizHistory,
} from "./quiz-question-history";
import { selectQuestionStyles, styleInstruction } from "./quiz-question-styles";
import { searchRuleChunks, type RetrievedRuleChunk } from "./rag";
import type { QuizDifficulty, QuizDiscipline, RefereeLevel } from "./quiz-programs";
import type { RuleSet } from "./rule-source-classification";

export class QuizGenerationError extends Error {
  constructor(public code: string, message: string, public status = 422) {
    super(message);
  }
}

export type QuizGenerationFlow = "adaptive" | "program" | "module";

type GenerateQuestionInput = {
  supabase: SupabaseClient;
  userId: string;
  discipline: QuizDiscipline;
  refereeLevel: RefereeLevel;
  difficulty: QuizDifficulty;
  topic: string;
  flow?: QuizGenerationFlow;
  moduleId?: string | null;
  quizSessionId?: string | null;
  sessionHistory?: StructuredQuizHistory[];
  rulesets?: RuleSet[];
  sourceQuery?: string;
  requireSourceTopic?: boolean;
  maxBatches?: number;
};

const rawQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).length(4),
  answer: z.string(),
  explanation: z.string(),
  ruleReference: z.string(),
  discipline: z.enum(["indoor", "beach"]),
  refereeLevel: z.enum(["level_1", "level_2", "level_3", "level_4"]),
  difficulty: z.enum(["basic", "applied", "advanced"]),
  topic: z.string(),
  subtopic: z.string(),
  ruleId: z.string(),
  scenarioType: z.string(),
  refereeRole: z.enum(["first_referee", "second_referee", "scorer", "line_judge", "joint_crew", "not_applicable"]),
  decisionType: z.string(),
  questionStyle: questionStyleSchema,
  sourceDocumentId: z.string(),
  sourceChunkIds: z.array(z.string()),
  sourceExcerpt: z.string(),
});

const candidateBatchSchema = z.object({
  candidates: z.array(z.object({ slotId: z.string(), question: rawQuestionSchema })).min(1).max(4),
});

const verificationSchema = z.object({
  results: z.array(z.object({
    slotId: z.string(),
    supported: z.boolean(),
    issues: z.array(z.string()),
  })),
});

type CandidateBlueprint = { slotId: string; style: QuestionStyle; chunk: RetrievedRuleChunk };

function sourceRuleNumbers(chunk: RetrievedRuleChunk) {
  const values = new Set<string>();
  if (chunk.rule_number) values.add(chunk.rule_number);
  for (const match of chunk.chunk_text.matchAll(/\b(\d{1,2}(?:\.\d+){1,4})\s+(?=[A-Z])/g)) values.add(match[1]);
  return Array.from(values);
}

function historySummary(history: StructuredQuizHistory[]) {
  const compact = <K extends keyof StructuredQuizHistory>(key: K) =>
    Array.from(new Set(history.map((item) => item[key]).filter(Boolean))).slice(0, 12);
  return {
    recentRuleIds: compact("ruleId"),
    recentScenarioTypes: compact("scenarioType"),
    recentDecisionTypes: compact("decisionType"),
    recentRefereeRoles: compact("refereeRole"),
    recentQuestionStyles: compact("questionStyle"),
    recentSourceChunkIds: Array.from(new Set(history.flatMap((item) => item.sourceChunkIds || []))).slice(0, 20),
    recentQuestionTexts: history.map((item) => item.questionText).filter(Boolean).slice(0, 12),
  };
}

function levelGuidance(level: RefereeLevel) {
  if (level === "level_1") return "Use fundamental rules, basic procedures, and one clear application. Do not test higher-level crew authority, positioning, cooperation, or match-management competencies.";
  if (level === "level_2") return "Use realistic role-based application involving referee responsibilities, authority, positioning, cooperation, communication, procedure, or match management, while staying within Level 2.";
  return "Use realistic applied officiating judgment while staying within the assigned referee level.";
}

function disciplineGuidance(discipline: QuizDiscipline, rulesets: RuleSet[]) {
  if (rulesets.some((ruleset) => ruleset.startsWith("rallyball"))) return "This is an explicitly assigned Rallyball module. Use only the supplied Rallyball source and its stated format.";
  return discipline === "indoor"
    ? "This is standard six-player Indoor volleyball. Never use Rallyball, Tripleball, tossed-ball sequences, or youth game variations."
    : "This is two-player Beach volleyball. Do not use Indoor or Rallyball procedures.";
}

function makeBlueprints(chunks: RetrievedRuleChunk[], styles: QuestionStyle[], count: number, batchIndex: number): CandidateBlueprint[] {
  return Array.from({ length: count }, (_, index) => ({
    slotId: `batch_${batchIndex + 1}_slot_${index + 1}`,
    style: styles[index],
    chunk: chunks[(index + batchIndex * count) % chunks.length],
  }));
}

function generationMessages(input: GenerateQuestionInput, blueprints: CandidateBlueprint[], history: StructuredQuizHistory[]) {
  const rulesets = input.rulesets || [input.discipline === "indoor" ? "standard_indoor" : "beach"];
  const blueprintJson = blueprints.map((blueprint) => ({
    slotId: blueprint.slotId,
    questionStyle: blueprint.style,
    styleInstruction: styleInstruction(blueprint.style),
    source: {
      sourceChunkId: blueprint.chunk.id,
      sourceDocumentId: blueprint.chunk.document_id,
      sourceTitle: blueprint.chunk.document_title,
      ruleset: blueprint.chunk.ruleset,
      ruleNumbers: sourceRuleNumbers(blueprint.chunk),
      sectionTitle: blueprint.chunk.section_title,
      pageNumber: blueprint.chunk.page_number,
      text: blueprint.chunk.chunk_text.slice(0, 3200),
    },
  }));
  return [
    {
      role: "system" as const,
      content: `You create official-source-grounded volleyball referee multiple-choice questions. ${disciplineGuidance(input.discipline, rulesets)} Use only the source assigned to each candidate. Scenario framing may vary, but every rule claim, correct answer, and explanation must be directly supported by that source. ${levelGuidance(input.refereeLevel)}`,
    },
    {
      role: "user" as const,
      content: `Create one question for every candidate blueprint below.

Global requirements:
- Exactly four unique, plausible options and exactly one correct answer.
- answer must exactly equal one option.
- Copy a concise sourceExcerpt as one contiguous passage from the assigned source text.
- Cite only the assigned sourceChunkId and sourceDocumentId.
- discipline must be "${input.discipline}", refereeLevel "${input.refereeLevel}", difficulty "${input.difficulty}", and topic "${input.topic}".
- questionStyle must exactly match the assigned blueprint.
- ruleId must exactly equal one of the assigned ruleNumbers when any are supplied. If no ruleNumbers are supplied, use a specific snake_case source-section identifier.
- subtopic, scenarioType, and decisionType must be precise snake_case descriptions of this candidate's actual tested concept. Do not copy labels from history and do not use generic labels.
- Make the scenario perspective, tested decision, and answer pattern materially different across candidates.
- Contextual details may make the situation realistic, but they must not add an unstated rule, exception, sanction, measurement, or procedure.

Recent user history to avoid:
${JSON.stringify(historySummary(history), null, 2)}

Candidate blueprints:
${JSON.stringify(blueprintJson, null, 2)}`,
    },
  ];
}

function verificationMessages(candidates: Array<{ slotId: string; question: GeneratedQuizQuestion; chunk: RetrievedRuleChunk }>) {
  return [
    {
      role: "system" as const,
      content: "You verify volleyball referee questions strictly against supplied official source text. Return supported=true only when the correct answer and explanation are fully entailed by the source and no rule claim depends on outside knowledge. Neutral team labels and score context are allowed.",
    },
    {
      role: "user" as const,
      content: JSON.stringify(candidates.map((candidate) => ({
        slotId: candidate.slotId,
        question: candidate.question.question,
        options: candidate.question.options,
        answer: candidate.question.answer,
        explanation: candidate.question.explanation,
        ruleReference: candidate.question.ruleReference,
        sourceExcerpt: candidate.question.sourceExcerpt,
        officialSourceText: candidate.chunk.chunk_text,
      })), null, 2),
    },
  ];
}

function diverseSourcePool(chunks: RetrievedRuleChunk[], history: StructuredQuizHistory[]) {
  const recentIds = new Set(history.slice(0, 20).flatMap((item) => item.sourceChunkIds || []));
  const seenGroups = new Set<string>();
  return [...chunks].sort((a, b) => Number(recentIds.has(a.id)) - Number(recentIds.has(b.id)) || b.similarity - a.similarity).filter((chunk) => {
    const group = `${chunk.document_id}:${chunk.rule_number || chunk.section_title || chunk.id}`;
    if (seenGroups.has(group)) return false;
    seenGroups.add(group);
    return true;
  });
}

export async function generateGroundedQuizQuestion(input: GenerateQuestionInput): Promise<GeneratedQuizQuestion> {
  const flow = input.flow || (input.quizSessionId ? "program" : "adaptive");
  const scope = flow === "program" ? "program" : flow === "module" ? "module" : "adaptive";
  const rulesets = input.rulesets || [input.discipline === "indoor" ? "standard_indoor" : "beach"];
  const requireSourceTopic = input.requireSourceTopic ?? flow !== "module";
  const candidateCount = flow === "adaptive" ? 3 : 4;
  const verifyCount = flow === "adaptive" ? 1 : 2;
  const databaseHistory = await getRecentStructuredQuizHistory({
    supabase: input.supabase,
    userId: input.userId,
    scope,
    moduleId: input.moduleId || null,
    discipline: input.discipline,
    refereeLevel: input.refereeLevel,
  });
  const history = [...(input.sessionHistory || []), ...databaseHistory];
  const excluded = Array.from(new Set(history.slice(0, 20).flatMap((item) => item.sourceChunkIds || [])));
  const chunks = await searchRuleChunks(
    input.sourceQuery || `${input.discipline} volleyball ${input.topic} referee ${input.refereeLevel}`,
    {
      discipline: input.discipline,
      refereeLevel: input.refereeLevel,
      topic: requireSourceTopic ? input.topic : undefined,
      rulesets,
      excludeChunkIds: excluded,
    },
    20
  );
  const fallbackChunks = chunks.length ? chunks : excluded.length ? await searchRuleChunks(
    input.sourceQuery || `${input.discipline} volleyball ${input.topic} referee ${input.refereeLevel}`,
    { discipline: input.discipline, refereeLevel: input.refereeLevel, topic: requireSourceTopic ? input.topic : undefined, rulesets },
    20
  ) : [];
  if (!fallbackChunks.length) throw new QuizGenerationError("INSUFFICIENT_SOURCE_CONTEXT", "No suitable official source material was found for this question.", 422);

  const pool = diverseSourcePool(fallbackChunks, history);
  const generationStartedAt = Date.now();
  let lastError: unknown = null;

  for (let batchIndex = 0; batchIndex < (input.maxBatches ?? 2); batchIndex += 1) {
    const styles = selectQuestionStyles(input.topic, input.difficulty, candidateCount, history, batchIndex * candidateCount);
    const blueprints = makeBlueprints(pool, styles, candidateCount, batchIndex);
    const blueprintById = new Map(blueprints.map((blueprint) => [blueprint.slotId, blueprint]));
    const batchStartedAt = Date.now();
    try {
      const generated = await llmObject(
        generationMessages(input, blueprints, history),
        candidateBatchSchema,
        input.refereeLevel === "level_3" || input.refereeLevel === "level_4" ? "quality" : "fast",
        { maxTokens: flow === "adaptive" ? 2400 : 3200, timeoutMs: 25_000, maxRetries: 0, userId: input.userId, tags: ["feature:quiz-generation", `flow:${flow}`] }
      );
      const survivors: Array<{ slotId: string; question: GeneratedQuizQuestion; chunk: RetrievedRuleChunk; penalty: number }> = [];

      for (const candidate of generated.candidates) {
        const blueprint = blueprintById.get(candidate.slotId);
        if (!blueprint) continue;
        try {
          const parsed = generatedQuizQuestionSchema.parse(candidate.question);
          const question = validateGeneratedQuestion(parsed, {
            discipline: input.discipline,
            refereeLevel: input.refereeLevel,
            difficulty: input.difficulty,
            topic: input.topic,
            questionStyle: blueprint.style,
            requireSourceTopic,
          }, [blueprint.chunk]);
          const sessionRepetition = assessStructuredRepetition(input.sessionHistory || [], question);
          if (sessionRepetition) throw new Error(`Repeated session ${sessionRepetition.reason}`);
          if ((input.sessionHistory || []).some((item) => quizQuestionTextSimilarity(item.questionText, question.question) >= 0.88)) {
            throw new Error("Repeated session wording");
          }
          const novelty = await assessQuizQuestionNovelty({
            supabase: input.supabase,
            userId: input.userId,
            scope,
            moduleId: input.moduleId || null,
            discipline: input.discipline,
            refereeLevel: input.refereeLevel,
            questionText: question.question,
            metadata: question,
          });
          if (novelty.duplicate) throw new Error(`Repeated ${novelty.reason}`);
          survivors.push({ slotId: candidate.slotId, question, chunk: blueprint.chunk, penalty: novelty.noveltyPenalty });
        } catch (error) {
          console.warn("Quiz candidate rejected", {
            flow, batch: batchIndex + 1, slotId: candidate.slotId,
            reason: error instanceof Error ? error.message : "unknown",
          });
        }
      }

      survivors.sort((a, b) => a.penalty - b.penalty);
      const verificationTargets = survivors.slice(0, verifyCount);
      if (!verificationTargets.length) throw new Error("No candidates passed deterministic validation");
      const verification = await llmObject(
        verificationMessages(verificationTargets),
        verificationSchema,
        "fast",
        { maxTokens: 500, timeoutMs: 12_000, maxRetries: 0, userId: input.userId, tags: ["feature:quiz-verification", `flow:${flow}`] }
      );
      const verificationById = new Map(verification.results.map((result) => [result.slotId, result]));
      const accepted = verificationTargets.find((candidate) => verificationById.get(candidate.slotId)?.supported === true);
      if (accepted) {
        console.info("Quiz generation accepted", {
          flow, discipline: input.discipline, refereeLevel: input.refereeLevel, topic: input.topic,
          style: accepted.question.questionStyle, ruleId: accepted.question.ruleId,
          batch: batchIndex + 1, candidates: generated.candidates.length, survivors: survivors.length,
          batchMs: Date.now() - batchStartedAt, totalMs: Date.now() - generationStartedAt,
        });
        return shuffleQuestionOptions(accepted.question);
      }
      lastError = new Error(`Grounding verifier rejected ${verificationTargets.length} candidate(s)`);
    } catch (error) {
      lastError = error;
    }
    console.warn("Quiz generation batch rejected", {
      flow, discipline: input.discipline, refereeLevel: input.refereeLevel, topic: input.topic,
      batch: batchIndex + 1, batchMs: Date.now() - batchStartedAt,
      reason: lastError instanceof Error ? lastError.message : "unknown",
    });
  }

  console.warn("Quiz generation failed", {
    code: "UNIQUE_QUESTION_GENERATION_FAILED", flow, discipline: input.discipline,
    refereeLevel: input.refereeLevel, topic: input.topic, totalMs: Date.now() - generationStartedAt,
    reason: lastError instanceof Error ? lastError.message : "unknown",
  });
  throw new QuizGenerationError("UNIQUE_QUESTION_GENERATION_FAILED", "A sufficiently distinct, source-supported question could not be generated.", 422);
}
