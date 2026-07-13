import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuestionLevel } from "./learning";

export type QuizQuestionScope = "adaptive" | "module" | "program";

export type QuizQuestionNovelty = {
  duplicate: boolean;
  reason: "exact" | "similar" | "rule" | "topic" | "scenario" | "role" | "decision" | null;
  maxSimilarity: number;
  similarQuestion: string | null;
};

type HistoryScopeParams = {
  supabase: SupabaseClient;
  userId: string;
  scope: QuizQuestionScope;
  moduleId?: string | null;
};

type RecordHistoryParams = HistoryScopeParams & {
  questionLevel?: QuestionLevel | null;
  question: unknown;
  quizSessionId?: string | null;
};

type AssessNoveltyParams = HistoryScopeParams & {
  questionText: string;
  metadata?: QuizQuestionMetadata;
};

export type QuizQuestionMetadata = {
  discipline?: string | null;
  refereeLevel?: string | null;
  topic?: string | null;
  subtopic?: string | null;
  ruleId?: string | null;
  ruleReference?: string | null;
  scenarioType?: string | null;
  refereeRole?: string | null;
  decisionType?: string | null;
};

export type StructuredQuizHistory = QuizQuestionMetadata & {
  questionText: string;
};

const RECENT_PROMPT_HISTORY_LIMIT = 75;
const COMPARE_HISTORY_LIMIT = 750;
const MAX_HISTORY_ROWS_PER_SCOPE = 1000;
const SIMILARITY_THRESHOLD = 0.78;
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "team",
  "the",
  "to",
  "what",
  "when",
  "which",
  "who",
  "with",
]);

export function extractQuizQuestionText(question: unknown): string {
  if (!question || typeof question !== "object") return "";
  const value = (question as { question?: unknown }).question;
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeQuizQuestionText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function quizQuestionSignature(text: string): string {
  return createHash("sha256").update(normalizeQuizQuestionText(text)).digest("hex");
}

function tokenCounts(text: string) {
  const counts = new Map<string, number>();
  for (const token of normalizeQuizQuestionText(text).split(" ")) {
    if (token.length < 3 || STOP_WORDS.has(token)) continue;
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  return counts;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>) {
  let dot = 0;
  let aMagnitude = 0;
  let bMagnitude = 0;

  for (const value of a.values()) {
    aMagnitude += value * value;
  }
  for (const [token, value] of b.entries()) {
    bMagnitude += value * value;
    dot += (a.get(token) || 0) * value;
  }

  if (!aMagnitude || !bMagnitude) return 0;
  return dot / (Math.sqrt(aMagnitude) * Math.sqrt(bMagnitude));
}

function applyModuleFilter<T>(
  query: T,
  moduleId: string | null | undefined
): T {
  const builder = query as T & {
    eq(column: string, value: string): T;
    is(column: string, value: null): T;
  };
  return moduleId ? builder.eq("module_id", moduleId) : builder.is("module_id", null);
}

export async function getRecentQuizQuestionHistory({
  supabase,
  userId,
  scope,
  moduleId = null,
}: HistoryScopeParams): Promise<string[]> {
  try {
    let query = supabase
      .from("quiz_question_history")
      .select("question_text")
      .eq("user_id", userId)
      .eq("scope", scope)
      .order("created_at", { ascending: false })
      .limit(RECENT_PROMPT_HISTORY_LIMIT);

    query = applyModuleFilter(query, moduleId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || [])
      .map((row) => row.question_text)
      .filter((text): text is string => typeof text === "string" && !!text.trim());
  } catch (error) {
    console.warn("Quiz question history lookup failed:", error);
    return [];
  }
}

export async function getRecentStructuredQuizHistory({
  supabase,
  userId,
  scope,
  moduleId = null,
}: HistoryScopeParams): Promise<StructuredQuizHistory[]> {
  try {
    let query = supabase
      .from("quiz_question_history")
      .select("question_text, discipline, referee_level, topic, subtopic, rule_id, rule_reference, scenario_type, referee_role, decision_type")
      .eq("user_id", userId)
      .eq("scope", scope)
      .order("created_at", { ascending: false })
      .limit(RECENT_PROMPT_HISTORY_LIMIT);
    query = applyModuleFilter(query, moduleId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((row) => ({
      questionText: row.question_text,
      discipline: row.discipline,
      refereeLevel: row.referee_level,
      topic: row.topic,
      subtopic: row.subtopic,
      ruleId: row.rule_id,
      ruleReference: row.rule_reference,
      scenarioType: row.scenario_type,
      refereeRole: row.referee_role,
      decisionType: row.decision_type,
    }));
  } catch (error) {
    console.warn("Structured quiz history lookup failed:", error);
    return [];
  }
}

export function assessStructuredRepetition(
  recent: StructuredQuizHistory[],
  metadata: QuizQuestionMetadata
): QuizQuestionNovelty | null {
  const checks: Array<{ key: keyof QuizQuestionMetadata; limit: number; max: number; reason: NonNullable<QuizQuestionNovelty["reason"]> }> = [
    { key: "ruleId", limit: 8, max: 0, reason: "rule" },
    { key: "scenarioType", limit: 5, max: 0, reason: "scenario" },
    { key: "decisionType", limit: 5, max: 0, reason: "decision" },
    { key: "topic", limit: 10, max: 2, reason: "topic" },
    { key: "subtopic", limit: 10, max: 1, reason: "topic" },
    { key: "refereeRole", limit: 10, max: 3, reason: "role" },
  ];
  for (const check of checks) {
    const value = metadata[check.key];
    if (!value) continue;
    const count = recent.slice(0, check.limit).filter((item) => item[check.key] === value).length;
    if (count > check.max) {
      return { duplicate: true, reason: check.reason, maxSimilarity: 1, similarQuestion: null };
    }
  }
  return null;
}

export async function assessQuizQuestionNovelty({
  supabase,
  userId,
  scope,
  moduleId = null,
  questionText,
  metadata,
}: AssessNoveltyParams): Promise<QuizQuestionNovelty> {
  const trimmedText = questionText.trim();
  if (!trimmedText) {
    return {
      duplicate: false,
      reason: null,
      maxSimilarity: 0,
      similarQuestion: null,
    };
  }

  try {
    const signature = quizQuestionSignature(trimmedText);
    let query = supabase
      .from("quiz_question_history")
      .select("question_text, question_signature")
      .eq("user_id", userId)
      .eq("scope", scope)
      .order("created_at", { ascending: false })
      .limit(COMPARE_HISTORY_LIMIT);

    query = applyModuleFilter(query, moduleId);
    const { data, error } = await query;
    if (error) throw error;

    if (metadata) {
      const structured = await getRecentStructuredQuizHistory({ supabase, userId, scope, moduleId });
      const repetition = assessStructuredRepetition(structured, metadata);
      if (repetition) return repetition;
    }

    const currentCounts = tokenCounts(trimmedText);
    let maxSimilarity = 0;
    let similarQuestion: string | null = null;

    for (const row of data || []) {
      const previousText = typeof row.question_text === "string" ? row.question_text : "";
      if (!previousText) continue;
      if (row.question_signature === signature) {
        return {
          duplicate: true,
          reason: "exact",
          maxSimilarity: 1,
          similarQuestion: previousText,
        };
      }

      const similarity = cosineSimilarity(currentCounts, tokenCounts(previousText));
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        similarQuestion = previousText;
      }
    }

    return {
      duplicate: maxSimilarity >= SIMILARITY_THRESHOLD,
      reason: maxSimilarity >= SIMILARITY_THRESHOLD ? "similar" : null,
      maxSimilarity,
      similarQuestion,
    };
  } catch (error) {
    console.warn("Quiz question novelty check failed:", error);
    return {
      duplicate: false,
      reason: null,
      maxSimilarity: 0,
      similarQuestion: null,
    };
  }
}

async function pruneQuizQuestionHistory({
  supabase,
  userId,
  scope,
  moduleId = null,
}: HistoryScopeParams): Promise<void> {
  try {
    let query = supabase
      .from("quiz_question_history")
      .select("id")
      .eq("user_id", userId)
      .eq("scope", scope)
      .order("created_at", { ascending: false })
      .range(MAX_HISTORY_ROWS_PER_SCOPE, MAX_HISTORY_ROWS_PER_SCOPE + 200);

    query = applyModuleFilter(query, moduleId);
    const { data, error } = await query;
    if (error) throw error;
    const ids = (data || []).map((row) => row.id).filter((id): id is string => typeof id === "string");
    if (ids.length === 0) return;

    await supabase.from("quiz_question_history").delete().in("id", ids);
  } catch (error) {
    console.warn("Quiz question history pruning failed:", error);
  }
}

export async function recordQuizQuestionHistory({
  supabase,
  userId,
  scope,
  moduleId = null,
  questionLevel = null,
  question,
  quizSessionId = null,
}: RecordHistoryParams): Promise<void> {
  const questionText = extractQuizQuestionText(question);
  if (!questionText) return;

  try {
    const metadata = question as QuizQuestionMetadata;
    const { error } = await supabase.from("quiz_question_history").insert({
      user_id: userId,
      scope,
      module_id: moduleId,
      question_level: questionLevel,
      question_text: questionText,
      question_signature: quizQuestionSignature(questionText),
      discipline: metadata.discipline ?? null,
      referee_level: metadata.refereeLevel ?? null,
      topic: metadata.topic ?? null,
      subtopic: metadata.subtopic ?? null,
      rule_id: metadata.ruleId ?? null,
      rule_reference: metadata.ruleReference ?? null,
      scenario_type: metadata.scenarioType ?? null,
      referee_role: metadata.refereeRole ?? null,
      decision_type: metadata.decisionType ?? null,
      quiz_session_id: quizSessionId,
    });
    if (error && error.code !== "23505") throw error;
    await pruneQuizQuestionHistory({ supabase, userId, scope, moduleId });
  } catch (error) {
    console.warn("Quiz question history recording failed:", error);
  }
}
