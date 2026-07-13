import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/llm", () => ({ llmObject: vi.fn() }));
vi.mock("../lib/rag", () => ({ searchRuleChunks: vi.fn() }));
vi.mock("../lib/quiz-question-styles", () => ({
  selectQuestionStyles: vi.fn((_topic, _difficulty, count) => Array.from({ length: count }, () => "referee_ruling")),
  styleInstruction: vi.fn(() => "Ask for the referee ruling."),
}));
vi.mock("../lib/quiz-question-history", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/quiz-question-history")>();
  return {
    ...actual,
    getRecentStructuredQuizHistory: vi.fn().mockResolvedValue([]),
    assessQuizQuestionNovelty: vi.fn().mockResolvedValue({ duplicate: false, reason: null, maxSimilarity: 0, similarQuestion: null, noveltyPenalty: 0 }),
  };
});

import { llmObject } from "../lib/llm";
import { assessQuizQuestionNovelty } from "../lib/quiz-question-history";
import { QuizGenerationError, generateGroundedQuizQuestion } from "../lib/quiz-generation";
import { searchRuleChunks } from "../lib/rag";

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
  similarity: 0.9,
  chunk_text: "Rule 12.4 requires the server to contact the ball within the permitted service time.",
};

const question = {
  question: "After authorization, what ruling should the first referee make if the server does not contact the ball in time?",
  options: ["Call a service fault", "Authorize a substitution", "Order a court switch", "Allow another attempt"],
  answer: "Call a service fault",
  explanation: "Failure to contact the ball within the permitted service time is a service fault.",
  ruleReference: "Rule 12.4 - Execution of service",
  discipline: "beach",
  refereeLevel: "level_1",
  difficulty: "basic",
  topic: "service_and_service_order",
  subtopic: "service_time_limit",
  ruleId: "12.4",
  scenarioType: "late_service_after_authorization",
  refereeRole: "first_referee",
  decisionType: "service_time_fault_ruling",
  questionStyle: "referee_ruling",
  sourceDocumentId: chunk.document_id,
  sourceChunkIds: [chunk.id],
  sourceExcerpt: "the server to contact the ball within the permitted service time",
};

const input = {
  supabase: {} as never,
  userId: "user",
  discipline: "beach" as const,
  refereeLevel: "level_1" as const,
  difficulty: "basic" as const,
  topic: "service_and_service_order",
};

function generatedBatch(value = question, batch = 1) {
  return { candidates: [{ slotId: `batch_${batch}_slot_1`, question: value }] };
}

function verification(supported = true, batch = 1) {
  return { results: [{ slotId: `batch_${batch}_slot_1`, supported, issues: supported ? [] : ["unsupported"] }] };
}

describe("grounded generation integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(searchRuleChunks).mockResolvedValue([chunk]);
    vi.mocked(llmObject).mockResolvedValueOnce(generatedBatch()).mockResolvedValueOnce(verification());
    vi.mocked(assessQuizQuestionNovelty).mockResolvedValue({ duplicate: false, reason: null, maxSimilarity: 0, similarQuestion: null, noveltyPenalty: 0 });
  });

  it("generates and verifies a Beach Level 1 question from active Beach context", async () => {
    await expect(generateGroundedQuizQuestion(input)).resolves.toMatchObject({ discipline: "beach", refereeLevel: "level_1", questionStyle: "referee_ruling" });
    expect(searchRuleChunks).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ discipline: "beach", refereeLevel: "level_1", rulesets: ["beach"] }), 20);
    expect(llmObject).toHaveBeenCalledTimes(2);
  });

  it("rejects a metadata mismatch and succeeds from the second source/style batch", async () => {
    vi.mocked(llmObject).mockReset()
      .mockResolvedValueOnce(generatedBatch({ ...question, discipline: "indoor" }))
      .mockResolvedValueOnce(generatedBatch(question, 2))
      .mockResolvedValueOnce(verification(true, 2));
    await expect(generateGroundedQuizQuestion(input)).resolves.toMatchObject({ discipline: "beach" });
    expect(llmObject).toHaveBeenCalledTimes(3);
  });

  it("returns a controlled missing-source error", async () => {
    vi.mocked(searchRuleChunks).mockResolvedValue([]);
    await expect(generateGroundedQuizQuestion(input)).rejects.toMatchObject({ code: "INSUFFICIENT_SOURCE_CONTEXT" });
  });

  it("never returns a deterministic duplicate fallback", async () => {
    vi.mocked(llmObject).mockReset()
      .mockResolvedValueOnce(generatedBatch(question, 1))
      .mockResolvedValueOnce(generatedBatch(question, 2));
    vi.mocked(assessQuizQuestionNovelty).mockResolvedValue({ duplicate: true, reason: "similar", maxSimilarity: 0.9, similarQuestion: "old", noveltyPenalty: 1 });
    await expect(generateGroundedQuizQuestion(input)).rejects.toEqual(expect.objectContaining<Partial<QuizGenerationError>>({ code: "UNIQUE_QUESTION_GENERATION_FAILED" }));
    expect(llmObject).toHaveBeenCalledTimes(2);
  });

  it("uses the second batch when the top adaptive candidate fails grounding verification", async () => {
    vi.mocked(llmObject).mockReset()
      .mockResolvedValueOnce(generatedBatch(question, 1))
      .mockResolvedValueOnce(verification(false, 1))
      .mockResolvedValueOnce(generatedBatch({ ...question, scenarioType: "service_clock_expiry", decisionType: "service_clock_fault" }, 2))
      .mockResolvedValueOnce(verification(true, 2));
    await expect(generateGroundedQuizQuestion(input)).resolves.toMatchObject({ scenarioType: "service_clock_expiry" });
    expect(llmObject).toHaveBeenCalledTimes(4);
  });

  it("generates four assigned candidates and verifies only the top two survivors", async () => {
    const candidates = Array.from({ length: 4 }, (_, index) => ({
      slotId: `batch_1_slot_${index + 1}`,
      question: {
        ...question,
        question: `${question.question} Case ${index + 1}.`,
        scenarioType: `assigned_service_case_${index + 1}`,
        decisionType: `assigned_service_ruling_${index + 1}`,
      },
    }));
    vi.mocked(llmObject).mockReset()
      .mockResolvedValueOnce({ candidates })
      .mockResolvedValueOnce({ results: candidates.slice(0, 2).map((candidate) => ({ slotId: candidate.slotId, supported: true, issues: [] })) });
    await expect(generateGroundedQuizQuestion({ ...input, flow: "program", quizSessionId: "session" })).resolves.toMatchObject({ discipline: "beach" });
    const generationPrompt = vi.mocked(llmObject).mock.calls[0][0][1].content;
    const verificationPrompt = vi.mocked(llmObject).mock.calls[1][0][1].content;
    expect(generationPrompt.match(/batch_1_slot_/g)).toHaveLength(4);
    expect(JSON.parse(verificationPrompt)).toHaveLength(2);
  });
});
