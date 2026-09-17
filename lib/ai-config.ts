function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function positiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export const AI_CONFIG = {
  provider: "deepseek" as const,
  baseUrl: "https://api.deepseek.com",
  model: "deepseek-flash",
  timeoutMs: positiveInteger(process.env.DEEPSEEK_TIMEOUT_MS, 25_000),
  outputTokens: {
    quiz: positiveInteger(process.env.DEEPSEEK_QUIZ_MAX_TOKENS, 1_000),
    verifier: positiveInteger(process.env.DEEPSEEK_VERIFIER_MAX_TOKENS, 100),
  },
  novelty: {
    candidateChunkCount: positiveInteger(process.env.QUIZ_CANDIDATE_CHUNK_COUNT, 16),
    maxAttempts: positiveInteger(process.env.QUIZ_MAX_GENERATION_ATTEMPTS, 2),
    recentChunkWindow: positiveInteger(process.env.QUIZ_RECENT_CHUNK_WINDOW, 16),
    recentRuleWindow: positiveInteger(process.env.QUIZ_RECENT_RULE_WINDOW, 10),
    recentCombinationWindow: positiveInteger(process.env.QUIZ_RECENT_COMBINATION_WINDOW, 100),
    nearDuplicateThreshold: positiveNumber(process.env.QUIZ_NEAR_DUPLICATE_THRESHOLD, 0.88),
    reservationMinutes: positiveInteger(process.env.QUIZ_RESERVATION_MINUTES, 30),
    assignedConcurrency: positiveInteger(process.env.QUIZ_ASSIGNED_CONCURRENCY, 3),
  },
  quotas: {
    questionHourly: positiveInteger(process.env.QUESTION_QUOTA_HOURLY, 20),
    questionDaily: positiveInteger(process.env.QUESTION_QUOTA_DAILY, 80),
    assignedHourly: positiveInteger(process.env.ASSIGNED_QUIZ_QUOTA_HOURLY, 40),
    assignedDaily: positiveInteger(process.env.ASSIGNED_QUIZ_QUOTA_DAILY, 120),
    allQuestionsHourly: positiveInteger(process.env.AI_QUESTION_QUOTA_HOURLY, 30),
    allQuestionsDaily: positiveInteger(process.env.AI_QUESTION_QUOTA_DAILY, 100),
  },
  rateLimits: {
    ipRequestsPerMinute: positiveInteger(process.env.API_IP_REQUESTS_PER_MINUTE, 180),
    userRequestsPerMinute: positiveInteger(process.env.API_USER_REQUESTS_PER_MINUTE, 120),
    userRequestsPerDay: positiveInteger(process.env.API_USER_REQUESTS_PER_DAY, 5_000),
    llmUserCallsPerMinute: positiveInteger(process.env.LLM_USER_CALLS_PER_MINUTE, 60),
    llmUserCallsPerDay: positiveInteger(process.env.LLM_USER_CALLS_PER_DAY, 200),
    llmUserTokensPerDay: positiveInteger(process.env.LLM_USER_TOKEN_BUDGET_DAILY, 250_000),
    llmGlobalCallsPerDay: positiveInteger(process.env.LLM_GLOBAL_CALLS_DAILY, 5_000),
    llmGlobalTokensPerDay: positiveInteger(process.env.LLM_GLOBAL_TOKEN_BUDGET_DAILY, 5_000_000),
  },
} as const;
