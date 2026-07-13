import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/llm", () => ({ llmChat: vi.fn() }));
vi.mock("../lib/rag", () => ({ searchRuleChunks: vi.fn() }));
vi.mock("../lib/quiz-question-history", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/quiz-question-history")>();
  return { ...actual, getRecentStructuredQuizHistory: vi.fn().mockResolvedValue([]), assessQuizQuestionNovelty: vi.fn().mockResolvedValue({ duplicate: false, reason: null, maxSimilarity: 0, similarQuestion: null }) };
});

import { llmChat } from "../lib/llm";
import { assessQuizQuestionNovelty } from "../lib/quiz-question-history";
import { QuizGenerationError, generateGroundedQuizQuestion } from "../lib/quiz-generation";
import { searchRuleChunks } from "../lib/rag";

const chunk = {
  id: "11111111-1111-4111-8111-111111111111", document_id: "22222222-2222-4222-8222-222222222222",
  document_title: "Official Beach Rules", document_type: "rulebook", discipline: "beach" as const, page_number: 10,
  rule_number: "12.4", section_title: "Service", case_number: null, topic: "service_and_service_order",
  source_url: null, storage_path: "rules/beach.pdf", similarity: 0.9,
  chunk_text: "Rule 12.4 requires the server to contact the ball within the permitted service time.",
};
const question = {
  question: "After authorization, what must the beach server do?", options: ["Serve in time", "Substitute", "Change court", "Touch the net"], answer: "Serve in time",
  explanation: "The server must complete service in the permitted time.", ruleReference: "Rule 12.4", discipline: "beach", refereeLevel: "level_1", difficulty: "basic",
  topic: "service_and_service_order", subtopic: "service_execution", ruleId: "12.4", scenarioType: "service_procedure", refereeRole: "first_referee", decisionType: "service_fault",
  sourceDocumentId: chunk.document_id, sourceChunkIds: [chunk.id], sourceExcerpt: "the server to contact the ball within the permitted service time",
};
const input = { supabase: {} as never, userId: "user", discipline: "beach" as const, refereeLevel: "level_1" as const, difficulty: "basic" as const, topic: "service_and_service_order" };

describe("grounded generation integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(searchRuleChunks).mockResolvedValue([chunk]);
    vi.mocked(llmChat).mockResolvedValue(JSON.stringify(question));
    vi.mocked(assessQuizQuestionNovelty).mockResolvedValue({ duplicate: false, reason: null, maxSimilarity: 0, similarQuestion: null });
  });

  it("generates an authenticated Beach Level 1-shaped question from Beach context", async () => {
    await expect(generateGroundedQuizQuestion(input)).resolves.toMatchObject({ discipline: "beach", refereeLevel: "level_1" });
    expect(searchRuleChunks).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ discipline: "beach", refereeLevel: "level_1" }), 8);
  });

  it("regenerates an indoor metadata mismatch and never returns it", async () => {
    vi.mocked(llmChat).mockResolvedValueOnce(JSON.stringify({ ...question, discipline: "indoor" })).mockResolvedValueOnce(JSON.stringify(question));
    await expect(generateGroundedQuizQuestion(input)).resolves.toMatchObject({ discipline: "beach" });
    expect(llmChat).toHaveBeenCalledTimes(2);
  });

  it("returns a controlled missing-source error", async () => {
    vi.mocked(searchRuleChunks).mockResolvedValue([]);
    await expect(generateGroundedQuizQuestion(input)).rejects.toMatchObject({ code: "INSUFFICIENT_SOURCE_CONTEXT" });
  });

  it("never returns a duplicate fallback", async () => {
    vi.mocked(assessQuizQuestionNovelty).mockResolvedValue({ duplicate: true, reason: "similar", maxSimilarity: 0.9, similarQuestion: "old" });
    await expect(generateGroundedQuizQuestion(input)).rejects.toEqual(expect.objectContaining<Partial<QuizGenerationError>>({ code: "UNIQUE_QUESTION_GENERATION_FAILED" }));
    expect(llmChat).toHaveBeenCalledTimes(5);
  });
});
