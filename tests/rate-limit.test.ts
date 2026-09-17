import { describe, expect, it, vi } from "vitest";
import { consumeRateLimits, enforceGenerationQuota, enforceRateLimits } from "../lib/rate-limit";

describe("AI feature quotas", () => {
  it("uses the atomic quota RPC with feature-specific limits", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    await enforceGenerationQuota({ rpc } as never, "11111111-1111-4111-8111-111111111111", 1, {
      feature: "module_question", hourly: 5, daily: 12,
    });
    expect(rpc).toHaveBeenCalledWith("consume_ai_quota", {
      quota_user_id: "11111111-1111-4111-8111-111111111111",
      quota_feature: "module_question",
      quota_units: 1,
      quota_hourly: 5,
      quota_daily: 12,
      quota_all_hourly: 30,
      quota_all_daily: 100,
    });
  });

  it("fails closed with 429 when quota is exhausted", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: false, error: null });
    await expect(enforceGenerationQuota({ rpc } as never, "11111111-1111-4111-8111-111111111111"))
      .rejects.toMatchObject({ code: "GENERATION_QUOTA_EXCEEDED", status: 429 });
  });

  it("passes multiple API and budget policies to one atomic RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { allowed: true, remaining: 4, retry_after: 0 }, error: null });
    const policies = [
      { subject: "user:1", scope: "minute", limit: 5, windowSeconds: 60 },
      { subject: "project", scope: "daily_tokens", units: 100, limit: 1_000, windowSeconds: 86_400 },
    ];
    await expect(consumeRateLimits({ rpc } as never, policies)).resolves.toMatchObject({ allowed: true, remaining: 4 });
    expect(rpc).toHaveBeenCalledWith("consume_rate_limits", {
      limit_policies: [
        { subject: "user:1", scope: "minute", units: 1, limit: 5, window_seconds: 60 },
        { subject: "project", scope: "daily_tokens", units: 100, limit: 1_000, window_seconds: 86_400 },
      ],
    });
  });

  it("returns a real 429 with the database retry interval", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { allowed: false, remaining: 0, retry_after: 37 }, error: null });
    await expect(enforceRateLimits(
      { rpc } as never,
      [{ subject: "user:1", scope: "minute", limit: 1, windowSeconds: 60 }],
      { code: "LIMITED", message: "Slow down" },
    )).rejects.toMatchObject({ code: "LIMITED", status: 429, retryAfter: 37 });
  });

  it("fails closed when the database limiter is unavailable", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "offline" } });
    await expect(consumeRateLimits(
      { rpc } as never,
      [{ subject: "user:1", scope: "minute", limit: 1, windowSeconds: 60 }],
    )).rejects.toMatchObject({ code: "RATE_LIMIT_UNAVAILABLE", status: 503 });
  });
});
