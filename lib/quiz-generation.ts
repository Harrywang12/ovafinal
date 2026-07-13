import type { SupabaseClient } from "@supabase/supabase-js";
import { parseGeneratedQuestionJson, validateGeneratedQuestion, type GeneratedQuizQuestion } from "./generated-quiz-question";
import { llmChat } from "./llm";
import { assessQuizQuestionNovelty, assessStructuredRepetition, getRecentStructuredQuizHistory, type StructuredQuizHistory } from "./quiz-question-history";
import { searchRuleChunks, type RetrievedRuleChunk } from "./rag";
import type { QuizDifficulty, QuizDiscipline, RefereeLevel } from "./quiz-programs";

export class QuizGenerationError extends Error {
  constructor(public code: string, message: string, public status = 422) {
    super(message);
  }
}

type GenerateQuestionInput = {
  supabase: SupabaseClient;
  userId: string;
  discipline: QuizDiscipline;
  refereeLevel: RefereeLevel;
  difficulty: QuizDifficulty;
  topic: string;
  quizSessionId?: string | null;
  sessionHistory?: StructuredQuizHistory[];
  maxAttempts?: number;
};

function historySummary(history: StructuredQuizHistory[]) {
  const compact = <K extends keyof StructuredQuizHistory>(key: K) =>
    Array.from(new Set(history.map((item) => item[key]).filter(Boolean))).slice(0, 20);
  return {
    recentRuleIds: compact("ruleId"),
    recentTopics: compact("topic"),
    recentScenarioTypes: compact("scenarioType"),
    recentDecisionTypes: compact("decisionType"),
    recentRefereeRoles: compact("refereeRole"),
    recentQuestionTexts: history.map((item) => item.questionText).filter(Boolean).slice(0, 30),
  };
}

function formatSourceContext(chunks: RetrievedRuleChunk[]) {
  return chunks.map((chunk) => [
    `SOURCE_CHUNK_ID: ${chunk.id}`,
    `SOURCE_DOCUMENT_ID: ${chunk.document_id}`,
    `SOURCE_TITLE: ${chunk.document_title}`,
    `DOCUMENT_TYPE: ${chunk.document_type}`,
    `RULESET: ${chunk.ruleset}`,
    `RULE_NUMBER: ${chunk.rule_number || "not tagged"}`,
    `SECTION: ${chunk.section_title || "not tagged"}`,
    `TEXT: ${chunk.chunk_text}`,
  ].join("\n")).join("\n\n---\n\n");
}

function generationPrompt(input: GenerateQuestionInput, chunks: RetrievedRuleChunk[], history: StructuredQuizHistory[]) {
  const levelGuidance = input.refereeLevel === "level_1"
    ? "Use fundamental rules, basic procedures, and a simple application. Do not test Level 2 authority, crew positioning, cooperation, or match-management competencies."
    : input.refereeLevel === "level_2"
      ? "Test referee responsibilities, authority, positioning, cooperation, communication, procedures, or match management through a role-based scenario; do not merely ask harder rule recall."
      : "Stay within the assigned referee level while using a realistic applied officiating scenario.";
  const formatGuidance = input.discipline === "indoor"
    ? "This is standard six-player Indoor volleyball. Never use Rallyball, Tripleball, tossed-ball sequences, three-ball sequences, or youth game variations."
    : "This is two-player Beach volleyball. Do not use Indoor or Rallyball procedures.";
  return {
    system: `You generate official-source-grounded volleyball referee MCQs. Generate exactly one ${input.discipline} question for ${input.refereeLevel}. ${formatGuidance} Use only the supplied source excerpts. Never use outside knowledge or unsupported assumptions. ${levelGuidance} Return JSON only.`,
    user: `Create one realistic game scenario for topic "${input.topic}" at ${input.difficulty} difficulty.

Requirements:
- Exactly four unique, plausible, non-empty options and exactly one correct answer.
- The answer must exactly equal one option.
- Copy a short supporting sourceExcerpt verbatim from one cited source chunk.
- sourceChunkIds may contain only supplied SOURCE_CHUNK_ID values.
- sourceDocumentId must match a cited chunk.
- ruleReference and ruleId are required.
- Metadata discipline must be "${input.discipline}", refereeLevel "${input.refereeLevel}", difficulty "${input.difficulty}", and topic "${input.topic}".
- Avoid the structured history below.

Recent history:
${JSON.stringify(historySummary(history), null, 2)}

Official source excerpts:
${formatSourceContext(chunks)}

Return this exact JSON shape:
${JSON.stringify({
  question: "string", options: ["string", "string", "string", "string"], answer: "exact option string",
  explanation: "string", ruleReference: "string", discipline: input.discipline,
  refereeLevel: input.refereeLevel, difficulty: input.difficulty, topic: input.topic,
  subtopic: "string", ruleId: "string", scenarioType: "string",
  refereeRole: "first_referee | second_referee | scorer | line_judge | joint_crew | not_applicable",
  decisionType: "string", sourceDocumentId: "uuid", sourceChunkIds: ["uuid"], sourceExcerpt: "verbatim excerpt",
}, null, 2)}`,
  };
}

export async function generateGroundedQuizQuestion(input: GenerateQuestionInput): Promise<GeneratedQuizQuestion> {
  const requiredRuleset = input.discipline === "indoor" ? "standard_indoor" : "beach";
  const chunks = await searchRuleChunks(
    `${input.discipline} volleyball ${input.topic} referee ${input.refereeLevel}`,
    { discipline: input.discipline, refereeLevel: input.refereeLevel, topic: input.topic, rulesets: [requiredRuleset] },
    8
  );
  if (!chunks.length) {
    throw new QuizGenerationError("INSUFFICIENT_SOURCE_CONTEXT", "No suitable official source material was found for this question.", 422);
  }

  const databaseHistory = await getRecentStructuredQuizHistory({
    supabase: input.supabase,
    userId: input.userId,
    scope: input.quizSessionId ? "program" : "adaptive",
  });
  const history = [...(input.sessionHistory || []), ...databaseHistory];
  let lastError: unknown = null;
  const rejected: StructuredQuizHistory[] = [];

  for (let attempt = 0; attempt < (input.maxAttempts ?? 5); attempt += 1) {
    try {
      const prompt = generationPrompt(input, chunks, [...rejected, ...history]);
      const content = await llmChat([
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ], input.refereeLevel === "level_1" ? "gpt-4o-mini" : "gpt-4o", { temperature: 0.75 });
      const parsed = parseGeneratedQuestionJson(content);
      const question = validateGeneratedQuestion(parsed, input, chunks);
      const sessionRepetition = assessStructuredRepetition(input.sessionHistory || [], question);
      if (sessionRepetition) {
        rejected.unshift({ ...question, questionText: question.question });
        lastError = new Error(`Rejected session ${sessionRepetition.reason || "repetition"}`);
        continue;
      }
      const novelty = await assessQuizQuestionNovelty({
        supabase: input.supabase,
        userId: input.userId,
        scope: input.quizSessionId ? "program" : "adaptive",
        questionText: question.question,
        metadata: question,
      });
      if (!novelty.duplicate) return question;
      rejected.unshift({ ...question, questionText: question.question });
      lastError = new Error(`Rejected repeated ${novelty.reason || "question"}`);
    } catch (error) {
      lastError = error;
    }
  }
  console.warn("Quiz generation failed", {
    code: "UNIQUE_QUESTION_GENERATION_FAILED",
    discipline: input.discipline,
    refereeLevel: input.refereeLevel,
    topic: input.topic,
    reason: lastError instanceof Error ? lastError.message : "unknown",
  });
  throw new QuizGenerationError("UNIQUE_QUESTION_GENERATION_FAILED", "A sufficiently distinct question could not be generated.", 422);
}
