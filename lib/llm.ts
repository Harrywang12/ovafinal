import type { z } from "zod";
import { AI_CONFIG } from "./ai-config";
import { recordAIRequestTelemetry } from "./ai-telemetry";
import { enforceLLMBudget } from "./rate-limit";

export type LLMProfile = "fast";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens: number;
  timeoutMs?: number;
  maxRetries?: number;
  userId: string;
  requestType: string;
  attempt?: number;
}

type DeepSeekUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  prompt_cache_hit_tokens?: number;
  prompt_cache_miss_tokens?: number;
};

type DeepSeekResponse = {
  model?: string;
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: DeepSeekUsage;
  error?: { message?: string };
};

export class LLMResponseError extends Error {
  constructor(public code: "EMPTY_RESPONSE" | "MALFORMED_JSON" | "SCHEMA_VALIDATION_FAILED", message: string) {
    super(message);
  }
}

function parseJsonContent(content: string) {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  if (!trimmed) throw new LLMResponseError("EMPTY_RESPONSE", "DeepSeek returned an empty response");
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
      } catch {
        // Report one bounded formatting error; the caller owns any retry.
      }
    }
    throw new LLMResponseError("MALFORMED_JSON", "DeepSeek returned malformed JSON");
  }
}

async function requestDeepSeek(messages: ChatMessage[], options: LLMOptions, forceJson: boolean) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("Missing environment variables: DEEPSEEK_API_KEY");
  const startedAt = Date.now();
  const requestType = options.requestType;
  await enforceLLMBudget(
    options.userId,
    messages.reduce((total, message) => total + message.content.length, 0),
    options.maxTokens,
  );
  let response: Response;
  try {
    response = await fetch(`${AI_CONFIG.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens,
        stream: false,
        ...(forceJson ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(options.timeoutMs ?? AI_CONFIG.timeoutMs),
    });
  } catch (error) {
    const telemetry = {
      requestType, model: AI_CONFIG.model, attempt: options.attempt ?? 1,
      latencyMs: Date.now() - startedAt, outcome: "transport_error", userId: options.userId || null,
      inputTokens: null, outputTokens: null, totalTokens: null, cacheHitTokens: null, cacheMissTokens: null,
    };
    console.info("deepseek_request", telemetry);
    await recordAIRequestTelemetry({ ...telemetry, userId: options.userId });
    throw error;
  }
  const payload = await response.json().catch(() => ({})) as DeepSeekResponse;
  const usage = payload.usage || {};
  const telemetry = {
    requestType,
    model: payload.model || AI_CONFIG.model,
    inputTokens: usage.prompt_tokens ?? null,
    outputTokens: usage.completion_tokens ?? null,
    totalTokens: usage.total_tokens ?? null,
    cacheHitTokens: usage.prompt_cache_hit_tokens ?? null,
    cacheMissTokens: usage.prompt_cache_miss_tokens ?? null,
    latencyMs: Date.now() - startedAt,
    attempt: options.attempt ?? 1,
    outcome: response.ok ? "success" : "provider_error",
    userId: options.userId || null,
  };
  console.info("deepseek_request", telemetry);
  await recordAIRequestTelemetry({
    ...telemetry,
    userId: options.userId,
    inputTokens: telemetry.inputTokens,
    outputTokens: telemetry.outputTokens,
    totalTokens: telemetry.totalTokens,
    cacheHitTokens: telemetry.cacheHitTokens,
    cacheMissTokens: telemetry.cacheMissTokens,
  });
  if (!response.ok) throw new Error(payload.error?.message || `DeepSeek request failed (${response.status})`);
  const content = payload.choices?.[0]?.message?.content;
  if (!content?.trim()) throw new LLMResponseError("EMPTY_RESPONSE", "DeepSeek returned an empty response");
  return content;
}

export async function llmObject<T>(
  messages: ChatMessage[],
  schema: z.ZodType<T>,
  _model: LLMProfile = "fast",
  options: LLMOptions,
): Promise<T> {
  const parsed = parseJsonContent(await requestDeepSeek(messages, options, true));
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new LLMResponseError("SCHEMA_VALIDATION_FAILED", `DeepSeek JSON failed validation: ${result.error.issues[0]?.message || "invalid response"}`);
  }
  return result.data;
}
