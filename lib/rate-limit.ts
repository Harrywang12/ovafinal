import type { SupabaseClient } from "@supabase/supabase-js";
import { AI_CONFIG } from "./ai-config";
import { getServerSupabase } from "./supabase";

export class RateLimitError extends Error {
  readonly status = 429;

  constructor(
    public readonly code: string,
    message: string,
    public readonly retryAfter: number,
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

export class RateLimitUnavailableError extends Error {
  readonly status = 503;
  readonly code = "RATE_LIMIT_UNAVAILABLE";

  constructor(message = "Rate-limit service is unavailable. Try again shortly.") {
    super(message);
    this.name = "RateLimitUnavailableError";
  }
}

export type RateLimitPolicy = {
  subject: string;
  scope: string;
  limit: number;
  windowSeconds: number;
  units?: number;
};

type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retry_after: number;
};

function positiveInteger(value: number, name: string) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
}

export async function consumeRateLimits(supabase: SupabaseClient, policies: RateLimitPolicy[]) {
  if (!policies.length || policies.length > 10) throw new Error("Between 1 and 10 rate-limit policies are required");
  const normalized = policies.map((policy) => ({
    subject: policy.subject.slice(0, 512),
    scope: policy.scope.slice(0, 100),
    units: positiveInteger(policy.units ?? 1, "Rate-limit units"),
    limit: positiveInteger(policy.limit, "Rate-limit value"),
    window_seconds: positiveInteger(policy.windowSeconds, "Rate-limit window"),
  }));
  if (normalized.some((policy) => !policy.subject || !policy.scope)) throw new Error("Rate-limit subject and scope are required");

  const { data, error } = await supabase.rpc("consume_rate_limits", { limit_policies: normalized });
  if (error) throw new RateLimitUnavailableError(`Rate-limit service failed: ${error.message}`);
  const decision = data as RateLimitDecision | null;
  if (!decision || typeof decision.allowed !== "boolean") throw new RateLimitUnavailableError();
  return decision;
}

export async function enforceRateLimits(
  supabase: SupabaseClient,
  policies: RateLimitPolicy[],
  options: { code: string; message: string },
) {
  const decision = await consumeRateLimits(supabase, policies);
  if (!decision.allowed) {
    throw new RateLimitError(options.code, options.message, Math.max(1, decision.retry_after || 60));
  }
  return decision;
}

export async function enforceIpApiRateLimit(supabase: SupabaseClient, clientIp: string) {
  return enforceRateLimits(supabase, [{
    subject: `ip:${clientIp}`,
    scope: "api_ip_minute",
    limit: AI_CONFIG.rateLimits.ipRequestsPerMinute,
    windowSeconds: 60,
  }], {
    code: "API_RATE_LIMIT_EXCEEDED",
    message: "Too many requests. Try again shortly.",
  });
}

export function clientIpFromRequest(request: Request) {
  const forwarded = (request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for"))
    ?.split(",")[0]?.trim();
  return (forwarded || request.headers.get("x-real-ip") || "unknown").slice(0, 128);
}

export async function enforceAuthenticatedApiRateLimit(supabase: SupabaseClient, userId: string) {
  return enforceRateLimits(supabase, [
    {
      subject: `user:${userId}`,
      scope: "api_user_minute",
      limit: AI_CONFIG.rateLimits.userRequestsPerMinute,
      windowSeconds: 60,
    },
    {
      subject: `user:${userId}`,
      scope: "api_user_day",
      limit: AI_CONFIG.rateLimits.userRequestsPerDay,
      windowSeconds: 86_400,
    },
  ], {
    code: "API_RATE_LIMIT_EXCEEDED",
    message: "Your API request limit has been reached. Try again later.",
  });
}

export async function enforceLLMBudget(userId: string, inputCharacters: number, maxOutputTokens: number) {
  const estimatedTokens = Math.max(1, Math.ceil(inputCharacters / 3) + maxOutputTokens);
  return enforceRateLimits(getServerSupabase(), [
    {
      subject: `user:${userId}`,
      scope: "llm_user_calls_minute",
      limit: AI_CONFIG.rateLimits.llmUserCallsPerMinute,
      windowSeconds: 60,
    },
    {
      subject: `user:${userId}`,
      scope: "llm_user_calls_day",
      limit: AI_CONFIG.rateLimits.llmUserCallsPerDay,
      windowSeconds: 86_400,
    },
    {
      subject: `user:${userId}`,
      scope: "llm_user_tokens_day",
      units: estimatedTokens,
      limit: AI_CONFIG.rateLimits.llmUserTokensPerDay,
      windowSeconds: 86_400,
    },
    {
      subject: "project",
      scope: "llm_global_calls_day",
      limit: AI_CONFIG.rateLimits.llmGlobalCallsPerDay,
      windowSeconds: 86_400,
    },
    {
      subject: "project",
      scope: "llm_global_tokens_day",
      units: estimatedTokens,
      limit: AI_CONFIG.rateLimits.llmGlobalTokensPerDay,
      windowSeconds: 86_400,
    },
  ], {
    code: "LLM_BUDGET_EXCEEDED",
    message: "AI generation capacity has been reached. Try again later.",
  });
}

export async function enforceGenerationQuota(
  supabase: SupabaseClient,
  userId: string,
  units = 1,
  options: { hourly?: number; daily?: number; feature?: string } = {}
) {
  const hourly = options.hourly ?? AI_CONFIG.quotas.questionHourly;
  const daily = options.daily ?? AI_CONFIG.quotas.questionDaily;
  const { data: allowed, error: quotaError } = await supabase.rpc("consume_ai_quota", {
    quota_user_id: userId,
    quota_feature: options.feature || "quiz_question",
    quota_units: units,
    quota_hourly: hourly,
    quota_daily: daily,
    quota_all_hourly: AI_CONFIG.quotas.allQuestionsHourly,
    quota_all_daily: AI_CONFIG.quotas.allQuestionsDaily,
  });
  if (quotaError) throw quotaError;
  if (!allowed) {
    throw new RateLimitError("GENERATION_QUOTA_EXCEEDED", "AI usage quota exceeded. Try again later.", 3_600);
  }
}
