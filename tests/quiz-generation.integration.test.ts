import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/llm", () => ({ llmObject: vi.fn() }));
vi.mock("../lib/ai-telemetry", () => ({ recordQuizGenerationOutcome: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../lib/rag", () => ({ searchRuleChunks: vi.fn() }));
vi.mock("../lib/quiz-blueprint-planner", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/quiz-blueprint-planner")>();
  return {
    ...actual,
    getActiveBlueprintFingerprints: vi.fn().mockResolvedValue(new Set()),
    rankBlueprintCandidates: vi.fn().mockReturnValue([]),
    reserveBlueprint: vi.fn(),
    releaseBlueprint: vi.fn().mockResolvedValue(undefined),
    acceptBlueprint: vi.fn().mockResolvedValue(undefined),
  };
});
vi.mock("../lib/quiz-question-history", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/quiz-question-history")>();
  return {
    ...actual,
    getRecentStructuredQuizHistory: vi.fn().mockResolvedValue([]),
    assessQuizQuestionNovelty: vi.fn().mockResolvedValue({ duplicate: false, reason: null, maxSimilarity: 0, similarQuestion: null, noveltyPenalty: 0 }),
  };
});

import { llmObject } from "../lib/llm";
import { reserveBlueprint } from "../lib/quiz-blueprint-planner";
import { assessQuizQuestionNovelty } from "../lib/quiz-question-history";
import { QuizGenerationError, generateGroundedQuizQuestion } from "../lib/quiz-generation";
import { searchRuleChunks } from "../lib/rag";
import { RateLimitError } from "../lib/rate-limit";

const chunk = {
  id: "11111111-1111-4111-8111-111111111111",
  document_id: "22222222-2222-4222-8222-222222222222",
  document_title: "Official Beach Rules",
  document_type: "official_rulebook",
  discipline: "beach" as const,
  page_number: 10,
  ruleset: "beach" as const,
  rule_number: "12.4",
  section_title: "Service",
  case_number: null,
  topic: "service_and_service_order",
  topic_tags: ["service_and_service_order"],
  source_url: null,
  storage_path: "rules/beach.pdf",
  index_version: 2,
  chunk_index: 1,
  content_hash: "hash",
  similarity: 1,
  chunk_text: "Rule 12.4 requires the server to contact the ball within the permitted service time.",
};

const language = {
  question: "After authorization, what ruling should the first referee make if the server does not contact the ball in time?",
  options: ["Call a service fault", "Authorize a substitution", "Order a court switch", "Allow another attempt"],
  correctOptionIndex: 0,
  explanation: "Failure to contact the ball within the permitted service time is a service fault.",
  supportingQuote: "the server to contact the ball within the permitted service time",
};

function blueprint(sequence = 1) {
  return {
    sourceChunkId: chunk.id,
    ruleId: "12.4",
    questionStyle: "referee_ruling" as const,
    scenarioType: `late_service_after_authorization_${sequence}`,
    refereeRole: "first_referee" as const,
    decisionType: `service_time_fault_ruling_${sequence}`,
    fingerprint: String(sequence).padStart(64, "a"),
    reservationId: `reservation-${sequence}`,
    noveltyScore: sequence,
    chunk,
  };
}

const input = {
  supabase: {} as never,
  userId: "user",
  discipline: "beach" as const,
  refereeLevel: "level_1" as const,
  difficulty: "basic" as const,
  topic: "service_and_service_order",
};

const verified = { supported: true, answerSupported: true, explanationSupported: true };

describe("single-candidate grounded generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(searchRuleChunks).mockResolvedValue([chunk]);
    vi.mocked(reserveBlueprint).mockResolvedValue(blueprint());
    vi.mocked(llmObject).mockResolvedValueOnce(language).mockResolvedValueOnce(verified);
    vi.mocked(assessQuizQuestionNovelty).mockResolvedValue({ duplicate: false, reason: null, maxSimilarity: 0, similarQuestion: null, noveltyPenalty: 0 });
  });

  it("generates one Beach Level 1 candidate and verifies it", async () => {
    await expect(generateGroundedQuizQuestion(input)).resolves.toMatchObject({
      discipline: "beach", refereeLevel: "level_1", questionStyle: "referee_ruling", answer: language.options[0],
    });
    expect(searchRuleChunks).toHaveBeenCalledWith("", expect.objectContaining({ discipline: "beach", refereeLevel: "level_1", rulesets: ["beach"] }), 16);
    expect(llmObject).toHaveBeenCalledTimes(2);
    expect(vi.mocked(llmObject).mock.calls[0][3]).toMatchObject({ maxTokens: 1000, requestType: "quiz_generation:adaptive" });
    expect(vi.mocked(llmObject).mock.calls[1][3]).toMatchObject({ maxTokens: 100, requestType: "quiz_verification:adaptive" });
  });

  it("retries a malformed candidate with a different reserved blueprint", async () => {
    vi.mocked(reserveBlueprint).mockResolvedValueOnce(blueprint(1)).mockResolvedValueOnce(blueprint(2));
    vi.mocked(llmObject).mockReset()
      .mockResolvedValueOnce({ ...language, options: ["same", "same", "three", "four"] })
      .mockResolvedValueOnce(language)
      .mockResolvedValueOnce(verified);
    await expect(generateGroundedQuizQuestion(input)).resolves.toMatchObject({ discipline: "beach" });
    expect(reserveBlueprint).toHaveBeenCalledTimes(2);
    expect(llmObject).toHaveBeenCalledTimes(3);
  });

  it("returns a controlled missing-source error", async () => {
    vi.mocked(searchRuleChunks).mockResolvedValue([]);
    await expect(generateGroundedQuizQuestion(input)).rejects.toMatchObject({ code: "INSUFFICIENT_SOURCE_CONTEXT" });
  });

  it("never returns a deterministic duplicate fallback", async () => {
    vi.mocked(reserveBlueprint).mockResolvedValueOnce(blueprint(1)).mockResolvedValueOnce(blueprint(2));
    vi.mocked(llmObject).mockReset().mockResolvedValue(language);
    vi.mocked(assessQuizQuestionNovelty).mockResolvedValue({ duplicate: true, reason: "similar", maxSimilarity: 0.9, similarQuestion: "old", noveltyPenalty: 1 });
    await expect(generateGroundedQuizQuestion(input)).rejects.toEqual(expect.objectContaining<Partial<QuizGenerationError>>({ code: "UNIQUE_QUESTION_GENERATION_FAILED" }));
    expect(llmObject).toHaveBeenCalledTimes(2);
  });

  it("uses a different blueprint after grounding rejection", async () => {
    vi.mocked(reserveBlueprint).mockResolvedValueOnce(blueprint(1)).mockResolvedValueOnce(blueprint(2));
    vi.mocked(llmObject).mockReset()
      .mockResolvedValueOnce(language)
      .mockResolvedValueOnce({ supported: false, answerSupported: false, explanationSupported: true, failureCode: "ANSWER_NOT_ENTAILED" })
      .mockResolvedValueOnce(language)
      .mockResolvedValueOnce(verified);
    await expect(generateGroundedQuizQuestion(input)).resolves.toMatchObject({ scenarioType: "late_service_after_authorization_2" });
    expect(llmObject).toHaveBeenCalledTimes(4);
  });

  it("does not send question history or multiple candidate slots to DeepSeek", async () => {
    await generateGroundedQuizQuestion({ ...input, flow: "program", quizSessionId: "session" });
    const generationPrompt = vi.mocked(llmObject).mock.calls[0][0][1].content;
    expect(generationPrompt).not.toMatch(/recent|candidate.*2|slot/i);
    expect(generationPrompt).toContain("Official source");
  });

  it("never retries a provider call after the central credit budget rejects it", async () => {
    vi.mocked(llmObject).mockReset().mockRejectedValueOnce(new RateLimitError("LLM_BUDGET_EXCEEDED", "budget exhausted", 60));
    await expect(generateGroundedQuizQuestion(input)).rejects.toMatchObject({
      code: "LLM_BUDGET_EXCEEDED",
      status: 429,
    });
    expect(llmObject).toHaveBeenCalledTimes(1);
  });
});
