import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("../lib/ai-telemetry", () => ({ recordAIRequestTelemetry: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../lib/rate-limit", () => ({ enforceLLMBudget: vi.fn().mockResolvedValue(undefined) }));

import { AI_CONFIG } from "../lib/ai-config";
import { LLMResponseError, llmObject } from "../lib/llm";
import { enforceLLMBudget } from "../lib/rate-limit";

const options = {
  maxTokens: 100,
  userId: "11111111-1111-4111-8111-111111111111",
  requestType: "test",
};

describe("DeepSeek provider", () => {
  beforeEach(() => {
    process.env.DEEPSEEK_API_KEY = "test-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.DEEPSEEK_API_KEY;
  });

  it("uses the one official DeepSeek endpoint and validates JSON with Zod", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      model: "deepseek-flash",
      choices: [{ message: { content: '{"ok":true}' } }],
      usage: { prompt_tokens: 10, completion_tokens: 3, prompt_cache_hit_tokens: 6, prompt_cache_miss_tokens: 4 },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(llmObject([{ role: "user", content: "test" }], z.object({ ok: z.boolean() }), "fast", options)).resolves.toEqual({ ok: true });
    expect(AI_CONFIG).toMatchObject({ baseUrl: "https://api.deepseek.com", model: "deepseek-flash", provider: "deepseek" });
    expect(fetchMock).toHaveBeenCalledWith("https://api.deepseek.com/chat/completions", expect.objectContaining({ method: "POST" }));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ model: "deepseek-flash", response_format: { type: "json_object" }, stream: false });
    expect(enforceLLMBudget).toHaveBeenCalledWith(options.userId, 4, options.maxTokens);
  });

  it("fails explicitly on empty JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "" } }] }), { status: 200 })));
    await expect(llmObject([{ role: "user", content: "test" }], z.object({ ok: z.boolean() }), "fast", options))
      .rejects.toEqual(expect.objectContaining<Partial<LLMResponseError>>({ code: "EMPTY_RESPONSE" }));
  });

  it("fails explicitly on malformed JSON without provider retries", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "not-json" } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(llmObject([{ role: "user", content: "test" }], z.object({ ok: z.boolean() }), "fast", options))
      .rejects.toEqual(expect.objectContaining<Partial<LLMResponseError>>({ code: "MALFORMED_JSON" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("never contacts DeepSeek when the central budget rejects the call", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(enforceLLMBudget).mockRejectedValueOnce(Object.assign(new Error("budget exhausted"), { status: 429 }));
    await expect(llmObject([{ role: "user", content: "test" }], z.object({ ok: z.boolean() }), "fast", options))
      .rejects.toThrow("budget exhausted");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
