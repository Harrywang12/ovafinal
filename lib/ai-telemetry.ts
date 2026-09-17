import { getServerSupabase } from "./supabase";

export type AIRequestTelemetry = {
  userId?: string;
  requestType: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  cacheHitTokens: number | null;
  cacheMissTokens: number | null;
  latencyMs: number;
  attempt: number;
  outcome: string;
};

export async function recordAIRequestTelemetry(event: AIRequestTelemetry) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return;
  try {
    const { error } = await getServerSupabase().from("ai_request_telemetry").insert({
      user_id: event.userId || null,
      request_type: event.requestType,
      model: event.model,
      input_tokens: event.inputTokens,
      output_tokens: event.outputTokens,
      total_tokens: event.totalTokens,
      cache_hit_tokens: event.cacheHitTokens,
      cache_miss_tokens: event.cacheMissTokens,
      latency_ms: event.latencyMs,
      attempt: event.attempt,
      outcome: event.outcome,
    });
    if (error) console.warn("AI telemetry persistence failed", { message: error.message });
  } catch (error) {
    console.warn("AI telemetry persistence failed", { message: error instanceof Error ? error.message : "unknown" });
  }
}

export async function recordQuizGenerationOutcome(event: {
  userId: string;
  flow: string;
  attempt: number;
  blueprintFingerprint: string;
  outcome: "accepted" | "rejected";
  rejectionStage?: "generation" | "validation" | "duplicate" | "verification";
  rejectionReason?: string;
}) {
  try {
    const { error } = await getServerSupabase().from("quiz_generation_telemetry").insert({
      user_id: event.userId,
      flow: event.flow,
      attempt: event.attempt,
      blueprint_fingerprint: event.blueprintFingerprint,
      outcome: event.outcome,
      rejection_stage: event.rejectionStage || null,
      rejection_reason: event.rejectionReason?.slice(0, 240) || null,
    });
    if (error) console.warn("Quiz telemetry persistence failed", { message: error.message });
  } catch (error) {
    console.warn("Quiz telemetry persistence failed", { message: error instanceof Error ? error.message : "unknown" });
  }
}
