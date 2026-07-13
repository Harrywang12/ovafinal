import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuestionLevel } from "./learning";

export type QuizQuestionScope = "adaptive" | "module" | "program";

export type QuizQuestionNovelty = {
  duplicate: boolean;
  reason: "exact" | "similar" | "source_fact" | "concept" | null;
  maxSimilarity: number;
  similarQuestion: string | null;
  noveltyPenalty: number;
};

type HistoryScopeParams = {
  supabase: SupabaseClient;
  userId: string;
  scope: QuizQuestionScope;
  moduleId?: string | null;
  discipline?: string | null;
  refereeLevel?: string | null;
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
  questionStyle?: string | null;
  sourceChunkIds?: string[] | null;
  sourceExcerpt?: string | null;
};

export type StructuredQuizHistory = QuizQuestionMetadata & {
  questionText: string;
  sourceFactFingerprint?: string | null;
  conceptFingerprint?: string | null;
};

const RECENT_PROMPT_HISTORY_LIMIT = 75;
const STRUCTURED_COMPARE_LIMIT = 300;
const TEXT_COMPARE_LIMIT = 300;
const SIMILARITY_THRESHOLD = 0.88;
const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "have", "in", "is", "it",
  "of", "on", "or", "team", "the", "to", "what", "when", "which", "who", "with",
]);

export function extractQuizQuestionText(question: unknown): string {
  if (!question || typeof question !== "object") return "";
  const value = (question as { question?: unknown }).question;
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeQuizQuestionText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function quizQuestionSignature(text: string): string {
  return hash(normalizeQuizQuestionText(text));
}

export function sourceFactFingerprint(metadata: QuizQuestionMetadata) {
  const excerpt = normalizeQuizQuestionText(metadata.sourceExcerpt || "");
  if (!excerpt) return null;
  return hash(excerpt);
}

export function conceptFingerprint(metadata: QuizQuestionMetadata) {
  const values = [metadata.ruleId, metadata.scenarioType, metadata.decisionType, metadata.refereeRole, metadata.questionStyle]
    .map((value) => normalizeQuizQuestionText(value || ""));
  return values.every(Boolean) ? hash(values.join("|")) : null;
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
  for (const value of a.values()) aMagnitude += value * value;
  for (const [token, value] of b.entries()) {
    bMagnitude += value * value;
    dot += (a.get(token) || 0) * value;
  }
  if (!aMagnitude || !bMagnitude) return 0;
  return dot / (Math.sqrt(aMagnitude) * Math.sqrt(bMagnitude));
}

export function quizQuestionTextSimilarity(a: string, b: string) {
  return cosineSimilarity(tokenCounts(a), tokenCounts(b));
}

function applyModuleFilter<T>(query: T, moduleId: string | null | undefined): T {
  const builder = query as T & { eq(column: string, value: string): T; is(column: string, value: null): T };
  return moduleId ? builder.eq("module_id", moduleId) : builder.is("module_id", null);
}

function applyGenerationFilters<T>(query: T, discipline?: string | null, refereeLevel?: string | null): T {
  const builder = query as T & { eq(column: string, value: string): T };
  let filtered = query;
  if (discipline) filtered = (filtered as typeof builder).eq("discipline", discipline);
  if (refereeLevel) filtered = (filtered as typeof builder).eq("referee_level", refereeLevel);
  return filtered;
}

export async function getRecentQuizQuestionHistory(params: HistoryScopeParams): Promise<string[]> {
  try {
    let query = params.supabase.from("quiz_question_history").select("question_text")
      .eq("user_id", params.userId).eq("scope", params.scope)
      .order("created_at", { ascending: false }).limit(RECENT_PROMPT_HISTORY_LIMIT);
    query = applyModuleFilter(query, params.moduleId);
    query = applyGenerationFilters(query, params.discipline, params.refereeLevel);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((row) => row.question_text).filter((text): text is string => typeof text === "string" && !!text.trim());
  } catch (error) {
    console.warn("Quiz question history lookup failed:", error);
    return [];
  }
}

export async function getRecentStructuredQuizHistory(params: HistoryScopeParams): Promise<StructuredQuizHistory[]> {
  try {
    let query = params.supabase.from("quiz_question_history")
      .select("question_text, discipline, referee_level, topic, subtopic, rule_id, rule_reference, scenario_type, referee_role, decision_type, question_style, source_chunk_ids, source_fact_fingerprint, concept_fingerprint")
      .eq("user_id", params.userId).eq("scope", params.scope)
      .order("created_at", { ascending: false }).limit(STRUCTURED_COMPARE_LIMIT);
    query = applyModuleFilter(query, params.moduleId);
    query = applyGenerationFilters(query, params.discipline, params.refereeLevel);
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
      questionStyle: row.question_style,
      sourceChunkIds: row.source_chunk_ids,
      sourceFactFingerprint: row.source_fact_fingerprint,
      conceptFingerprint: row.concept_fingerprint,
    }));
  } catch (error) {
    console.warn("Structured quiz history lookup failed:", error);
    return [];
  }
}

export function assessStructuredRepetition(recent: StructuredQuizHistory[], metadata: QuizQuestionMetadata): QuizQuestionNovelty | null {
  const sourceFingerprint = sourceFactFingerprint(metadata);
  if (sourceFingerprint && recent.slice(0, 20).some((item) => (item.sourceFactFingerprint || sourceFactFingerprint(item)) === sourceFingerprint)) {
    return { duplicate: true, reason: "source_fact", maxSimilarity: 1, similarQuestion: null, noveltyPenalty: 1 };
  }
  const composite = conceptFingerprint(metadata);
  if (composite && recent.slice(0, 200).some((item) => (item.conceptFingerprint || conceptFingerprint(item)) === composite)) {
    return { duplicate: true, reason: "concept", maxSimilarity: 1, similarQuestion: null, noveltyPenalty: 1 };
  }
  return null;
}

export function calculateNoveltyPenalty(recent: StructuredQuizHistory[], metadata: QuizQuestionMetadata, maxSimilarity = 0) {
  const repeated = (key: keyof QuizQuestionMetadata, limit: number) => {
    const value = metadata[key];
    return Boolean(value && recent.slice(0, limit).some((item) => item[key] === value));
  };
  let penalty = maxSimilarity * 0.3;
  if (repeated("ruleId", 8)) penalty += 0.2;
  if (repeated("scenarioType", 6)) penalty += 0.15;
  if (repeated("decisionType", 6)) penalty += 0.15;
  if (repeated("refereeRole", 4)) penalty += 0.1;
  if (repeated("questionStyle", 4)) penalty += 0.1;
  const recentSourceIds = new Set(recent.slice(0, 12).flatMap((item) => item.sourceChunkIds || []));
  if ((metadata.sourceChunkIds || []).some((id) => recentSourceIds.has(id))) penalty += 0.2;
  return Number(penalty.toFixed(4));
}

export async function assessQuizQuestionNovelty(params: AssessNoveltyParams): Promise<QuizQuestionNovelty> {
  const trimmedText = params.questionText.trim();
  if (!trimmedText) return { duplicate: false, reason: null, maxSimilarity: 0, similarQuestion: null, noveltyPenalty: 0 };
  try {
    const signature = quizQuestionSignature(trimmedText);
    let exactQuery = params.supabase.from("quiz_question_history").select("question_text")
      .eq("user_id", params.userId).eq("scope", params.scope).eq("question_signature", signature).limit(1);
    exactQuery = applyModuleFilter(exactQuery, params.moduleId);
    const { data: exactRows, error: exactError } = await exactQuery;
    if (exactError) throw exactError;
    if (exactRows?.length) {
      return { duplicate: true, reason: "exact", maxSimilarity: 1, similarQuestion: exactRows[0].question_text, noveltyPenalty: 1 };
    }

    let textQuery = params.supabase.from("quiz_question_history").select("question_text")
      .eq("user_id", params.userId).eq("scope", params.scope)
      .order("created_at", { ascending: false }).limit(TEXT_COMPARE_LIMIT);
    textQuery = applyModuleFilter(textQuery, params.moduleId);
    textQuery = applyGenerationFilters(textQuery, params.metadata?.discipline || params.discipline, params.metadata?.refereeLevel || params.refereeLevel);
    const { data, error } = await textQuery;
    if (error) throw error;

    const structured = params.metadata ? await getRecentStructuredQuizHistory({
      ...params,
      discipline: params.metadata.discipline || params.discipline,
      refereeLevel: params.metadata.refereeLevel || params.refereeLevel,
    }) : [];
    if (params.metadata) {
      const repetition = assessStructuredRepetition(structured, params.metadata);
      if (repetition) return repetition;
    }

    const currentCounts = tokenCounts(trimmedText);
    let maxSimilarity = 0;
    let similarQuestion: string | null = null;
    for (const row of data || []) {
      const previousText = typeof row.question_text === "string" ? row.question_text : "";
      if (!previousText) continue;
      const similarity = cosineSimilarity(currentCounts, tokenCounts(previousText));
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        similarQuestion = previousText;
      }
    }
    const duplicate = maxSimilarity >= SIMILARITY_THRESHOLD;
    return {
      duplicate,
      reason: duplicate ? "similar" : null,
      maxSimilarity,
      similarQuestion,
      noveltyPenalty: params.metadata ? calculateNoveltyPenalty(structured, params.metadata, maxSimilarity) : maxSimilarity * 0.3,
    };
  } catch (error) {
    console.warn("Quiz question novelty check failed:", error);
    return { duplicate: false, reason: null, maxSimilarity: 0, similarQuestion: null, noveltyPenalty: 0 };
  }
}

export async function recordQuizQuestionHistory(params: RecordHistoryParams): Promise<void> {
  const questionText = extractQuizQuestionText(params.question);
  if (!questionText) return;
  try {
    const metadata = params.question as QuizQuestionMetadata;
    const { error } = await params.supabase.from("quiz_question_history").insert({
      user_id: params.userId,
      scope: params.scope,
      module_id: params.moduleId || null,
      question_level: params.questionLevel || null,
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
      question_style: metadata.questionStyle ?? null,
      source_chunk_ids: metadata.sourceChunkIds ?? null,
      source_fact_fingerprint: sourceFactFingerprint(metadata),
      concept_fingerprint: conceptFingerprint(metadata),
      quiz_session_id: params.quizSessionId || null,
    });
    if (error && error.code !== "23505") throw error;
  } catch (error) {
    console.warn("Quiz question history recording failed:", error);
  }
}
