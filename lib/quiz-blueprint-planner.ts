import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AI_CONFIG } from "./ai-config";
import type { QuestionStyle } from "./generated-quiz-question";
import { compatibleQuestionStyles } from "./quiz-question-styles";
import type { StructuredQuizHistory } from "./quiz-question-history";
import type { QuizDifficulty } from "./quiz-programs";
import type { RetrievedRuleChunk } from "./rag";

export type QuizBlueprint = {
  sourceChunkId: string;
  ruleId: string;
  questionStyle: QuestionStyle;
  scenarioType: string;
  refereeRole: "first_referee" | "second_referee" | "scorer" | "line_judge" | "joint_crew" | "not_applicable";
  decisionType: string;
  fingerprint: string;
  reservationId: string;
  chunk: RetrievedRuleChunk;
};

export type BlueprintCandidate = Omit<QuizBlueprint, "reservationId"> & { noveltyScore: number };

function snake(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 64) || "source_rule";
}

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function blueprintFingerprint(value: Pick<QuizBlueprint, "sourceChunkId" | "ruleId" | "questionStyle" | "scenarioType" | "refereeRole" | "decisionType">) {
  return digest([value.sourceChunkId, value.ruleId, value.questionStyle, value.scenarioType, value.refereeRole, value.decisionType].join("|"));
}

export function blueprintConceptKey(value: Pick<QuizBlueprint, "ruleId" | "questionStyle" | "scenarioType" | "refereeRole" | "decisionType">) {
  return [value.ruleId, value.questionStyle, value.scenarioType, value.refereeRole, value.decisionType].join("|");
}

function rolesFor(style: QuestionStyle) {
  if (style === "official_responsibility") return ["first_referee", "second_referee", "scorer", "line_judge", "joint_crew"] as const;
  if (style === "position_rotation_analysis") return ["second_referee", "scorer", "joint_crew"] as const;
  if (style === "sequence_order" || style === "correction_procedure") return ["first_referee", "second_referee", "joint_crew"] as const;
  return ["first_referee", "second_referee", "not_applicable"] as const;
}

function recencyIndex(history: StructuredQuizHistory[], predicate: (item: StructuredQuizHistory) => boolean) {
  return history.findIndex(predicate);
}

function recencyPenalty(index: number, weight: number, window: number) {
  return index < 0 ? 0 : weight * Math.max(0, (window - index) / window);
}

export function rankBlueprintCandidates(
  chunks: RetrievedRuleChunk[],
  topic: string,
  difficulty: QuizDifficulty,
  history: StructuredQuizHistory[],
  reservedFingerprints: Set<string> = new Set()
) {
  const candidates: BlueprintCandidate[] = [];
  const styles = compatibleQuestionStyles(topic, difficulty);
  for (const chunk of chunks) {
    const ruleId = chunk.rule_number || snake(chunk.section_title || chunk.content_hash || chunk.id);
    for (const style of styles) {
      for (const role of rolesFor(style)) {
        const scenarioType = snake(`${topic}_${style}_${role}`);
        const decisionType = snake(`${style}_${ruleId}_${role}`);
        const base = { sourceChunkId: chunk.id, ruleId, questionStyle: style, scenarioType, refereeRole: role, decisionType };
        const fingerprint = blueprintFingerprint(base);
        if (reservedFingerprints.has(fingerprint)) continue;
        const chunkIndex = recencyIndex(history, (item) => item.sourceChunkIds?.includes(chunk.id) === true);
        const ruleIndex = recencyIndex(history, (item) => item.ruleId === ruleId);
        const combinationIndex = recencyIndex(history, (item) => item.ruleId === ruleId && item.questionStyle === style);
        const scenarioIndex = recencyIndex(history, (item) => item.scenarioType === scenarioType);
        const roleIndex = recencyIndex(history, (item) => item.refereeRole === role);
        const decisionIndex = recencyIndex(history, (item) => item.decisionType === decisionType);
        const usageCount = history.filter((item) => item.ruleId === ruleId && item.questionStyle === style).length;
        const noveltyScore =
          recencyPenalty(chunkIndex, 60, AI_CONFIG.novelty.recentChunkWindow) +
          recencyPenalty(ruleIndex, 35, AI_CONFIG.novelty.recentRuleWindow) +
          recencyPenalty(combinationIndex, 50, AI_CONFIG.novelty.recentCombinationWindow) +
          recencyPenalty(scenarioIndex, 20, 30) +
          recencyPenalty(decisionIndex, 20, 30) +
          recencyPenalty(roleIndex, 5, 8) +
          usageCount * 2 - Math.min(5, Math.max(0, chunk.similarity || 0));
        candidates.push({ ...base, fingerprint, chunk, noveltyScore });
      }
    }
  }
  return candidates.sort((a, b) => a.noveltyScore - b.noveltyScore || a.fingerprint.localeCompare(b.fingerprint));
}

export async function getActiveBlueprintFingerprints(supabase: SupabaseClient, userId: string, scope: string) {
  const { data, error } = await supabase.from("quiz_blueprint_reservations")
    .select("blueprint_fingerprint").eq("user_id", userId).eq("scope", scope).is("released_at", null)
    .order("created_at", { ascending: false }).limit(300);
  if (error) throw error;
  return new Set((data || []).map((row) => row.blueprint_fingerprint as string));
}

export async function reserveBlueprint(input: {
  supabase: SupabaseClient;
  userId: string;
  scope: "adaptive" | "module" | "program";
  moduleId?: string | null;
  quizSessionId?: string | null;
  candidates: BlueprintCandidate[];
  excludedFingerprints?: Set<string>;
}): Promise<QuizBlueprint | null> {
  for (const candidate of input.candidates) {
    if (input.excludedFingerprints?.has(candidate.fingerprint)) continue;
    const { data, error } = await input.supabase.rpc("reserve_quiz_blueprint", {
      reservation_user_id: input.userId,
      reservation_scope: input.scope,
      reservation_module_id: input.moduleId || null,
      reservation_quiz_session_id: input.quizSessionId || null,
      reservation_fingerprint: candidate.fingerprint,
      reservation_source_chunk_id: candidate.sourceChunkId,
      reservation_rule_id: candidate.ruleId,
      reservation_question_style: candidate.questionStyle,
      reservation_scenario_type: candidate.scenarioType,
      reservation_referee_role: candidate.refereeRole,
      reservation_decision_type: candidate.decisionType,
      reservation_minutes: AI_CONFIG.novelty.reservationMinutes,
    });
    if (error) throw error;
    if (typeof data === "string" && data) return { ...candidate, reservationId: data } satisfies QuizBlueprint;
  }
  return null;
}

export async function releaseBlueprint(supabase: SupabaseClient, reservationId: string) {
  const { error } = await supabase.from("quiz_blueprint_reservations")
    .update({ released_at: new Date().toISOString() }).eq("id", reservationId).is("released_at", null);
  if (error) console.warn("Blueprint release failed", { reservationId, message: error.message });
}

export async function acceptBlueprint(supabase: SupabaseClient, reservationId: string) {
  const { error } = await supabase.from("quiz_blueprint_reservations")
    .update({ accepted_at: new Date().toISOString() }).eq("id", reservationId).is("released_at", null);
  if (error) throw error;
}
