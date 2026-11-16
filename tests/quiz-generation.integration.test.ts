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
import { acceptBlueprint, releaseBlueprint, reserveBlueprint } from "../lib/quiz-blueprint-planner";
import { recordQuizGenerationOutcome } from "../lib/ai-telemetry";
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

const indoorChunk = {
  ...chunk,
  discipline: "indoor" as const,
  ruleset: "standard_indoor" as const,
  document_title: "Volleyball Canada Indoor Rules",
  rule_number: "7.4",
  section_title: "Positions",
  topic: "positions_and_rotation",
  topic_tags: ["positions_and_rotation"],
  chunk_text: "7.4 POSITIONS. 7.4.3.1 A back-row player may be level with the corresponding front-row player or have part of one foot further from the centre line. 7.4.4 After the service hit, players may occupy any position on their court and the free zone.",
};
const indoorInput = { ...input, discipline: "indoor" as const, topic: indoorChunk.topic };
const indoorBlueprint = (sequence = 1) => ({
  ...blueprint(sequence), chunk: indoorChunk, ruleId: "7.4", refereeRole: "second_referee" as const,
  scenarioType: `indoor_position_ruling_${sequence}`, decisionType: `positional_fault_ruling_${sequence}`,
});
const reportedPositionQuestion = {
  question: "During a rally, the second referee observes that the front-row player positioned at the front-left of the court has moved to the front-right side while the ball is still in play, and the team's front-row alignment now shows only two players along the net on the left and centre. What is the second referee's correct ruling?",
  options: ["Call a positional fault", "Allow play to continue", "Replay the rally", "Warn the captain"],
  correctOptionIndex: 0,
  explanation: "The movement is illegal because front-row players must remain in their original positions throughout the rally.",
  supportingQuote: "After the service hit, players may occupy any position on their court and the free zone.",
};

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
    expect(vi.mocked(llmObject).mock.calls[0][2]).toMatchObject({ maxTokens: 1000, requestType: "quiz_generation:adaptive" });
    expect(vi.mocked(llmObject).mock.calls[1][2]).toMatchObject({ maxTokens: 100, requestType: "quiz_verification:adaptive" });
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

  it.each(["adaptive", "module", "program"] as const)("rejects the reported rally-movement error in the %s flow", async (flow) => {
    vi.mocked(reserveBlueprint).mockResolvedValue(indoorBlueprint());
    vi.mocked(llmObject).mockReset()
      .mockResolvedValueOnce(reportedPositionQuestion)
      // Even an otherwise positive entailment verdict cannot bypass this check.
      .mockResolvedValueOnce({ ...verified, positionRulesSupported: false });

    await expect(generateGroundedQuizQuestion({ ...indoorInput, flow, maxAttempts: 1 }))
      .rejects.toMatchObject({ code: "UNIQUE_QUESTION_GENERATION_FAILED" });
    expect(acceptBlueprint).not.toHaveBeenCalled();
    expect(releaseBlueprint).toHaveBeenCalledWith(input.supabase, "reservation-1");
    expect(recordQuizGenerationOutcome).toHaveBeenCalledWith(expect.objectContaining({
      flow, outcome: "rejected", rejectionStage: "verification", rejectionReason: "GROUNDING_POSITION_RULE_CONTRADICTION",
    }));
    for (const call of vi.mocked(llmObject).mock.calls) {
      expect(call[0][0].content).toContain("After the service hit, changing places");
      expect(call[0][0].content).toContain("level with is legal");
    }
    expect(vi.mocked(llmObject).mock.calls[1][0][0].content).toContain("Incorrect distractors are allowed");
  });

  it("requires an explicit indoor position check instead of accepting an omitted verdict", async () => {
    vi.mocked(reserveBlueprint).mockResolvedValue(indoorBlueprint());
    vi.mocked(llmObject).mockReset()
      .mockResolvedValueOnce(reportedPositionQuestion)
      .mockResolvedValueOnce(verified);
    await expect(generateGroundedQuizQuestion({ ...indoorInput, maxAttempts: 1 }))
      .rejects.toMatchObject({ code: "UNIQUE_QUESTION_GENERATION_FAILED" });
    expect(acceptBlueprint).not.toHaveBeenCalled();
  });

  it("retries the reported error and accepts the corrected allow-play ruling", async () => {
    vi.mocked(reserveBlueprint).mockResolvedValueOnce(indoorBlueprint(1)).mockResolvedValueOnce(indoorBlueprint(2));
    vi.mocked(llmObject).mockReset()
      .mockResolvedValueOnce(reportedPositionQuestion)
      .mockResolvedValueOnce({ ...verified, positionRulesSupported: false })
      .mockResolvedValueOnce({
        ...reportedPositionQuestion,
        correctOptionIndex: 1,
        explanation: "After service contact, changing places alone is legal; allow play to continue. The players retain their front-row or back-row status.",
      })
      .mockResolvedValueOnce({ ...verified, positionRulesSupported: true });
    await expect(generateGroundedQuizQuestion(indoorInput)).resolves.toMatchObject({
      answer: "Allow play to continue",
      scenarioType: "indoor_position_ruling_2",
    });
    expect(releaseBlueprint).toHaveBeenCalledWith(input.supabase, "reservation-1");
    expect(acceptBlueprint).toHaveBeenCalledWith(input.supabase, "reservation-2");
  });

  it.each([false, true])("handles level feet with a position check of %s", async (positionRulesSupported) => {
    vi.mocked(reserveBlueprint).mockResolvedValue(indoorBlueprint());
    vi.mocked(llmObject).mockReset()
      .mockResolvedValueOnce({
        question: "At service contact, back-row player 6 has both feet level with the front foot of player 3. All other positional relationships are correct. What is the ruling?",
        options: ["Allow play: level feet are legal", "Call a positional fault", "Replay the serve", "Order an immediate rotation"],
        correctOptionIndex: positionRulesSupported ? 0 : 1,
        explanation: positionRulesSupported ? "Level foot positioning is legal." : "Player 6 must be strictly behind player 3.",
        supportingQuote: "A back-row player may be level with the corresponding front-row player or have part of one foot further from the centre line.",
      })
      .mockResolvedValueOnce({ ...verified, positionRulesSupported });
    const result = generateGroundedQuizQuestion({ ...indoorInput, maxAttempts: 1 });
    if (positionRulesSupported) {
      await expect(result).resolves.toMatchObject({ answer: "Allow play: level feet are legal" });
    } else {
      await expect(result).rejects.toMatchObject({ code: "UNIQUE_QUESTION_GENERATION_FAILED" });
      expect(acceptBlueprint).not.toHaveBeenCalled();
    }
  });

  it("still permits a genuine back-row blocking fault during a rally", async () => {
    const blockSource = {
      ...indoorChunk, rule_number: "14.6.2",
      chunk_text: "14.6.2 A back-row player or a Libero completes a block or participates in a completed block.",
    };
    vi.mocked(reserveBlueprint).mockResolvedValue({ ...indoorBlueprint(), chunk: blockSource, ruleId: "14.6.2" });
    vi.mocked(llmObject).mockReset()
      .mockResolvedValueOnce({
        question: "During a rally, a back-row player moves to the net and completes a block. What is the ruling?",
        options: ["Call a blocking fault", "Allow play because movement is unrestricted", "Replay the rally", "Warn the captain"],
        correctOptionIndex: 0,
        explanation: "Moving to the net is legal, but the player retains back-row status and cannot complete a block.",
        supportingQuote: "A back-row player or a Libero completes a block or participates in a completed block.",
      })
      .mockResolvedValueOnce({ ...verified, positionRulesSupported: true });
    await expect(generateGroundedQuizQuestion(indoorInput)).resolves.toMatchObject({ answer: "Call a blocking fault" });
  });

  it("keeps the standard indoor position check out of Rallyball generation", async () => {
    const rallyballChunk = { ...indoorChunk, ruleset: "rallyball_6v6" as const };
    vi.mocked(reserveBlueprint).mockResolvedValue({ ...indoorBlueprint(), chunk: rallyballChunk });
    vi.mocked(llmObject).mockReset()
      .mockResolvedValueOnce({ ...reportedPositionQuestion, correctOptionIndex: 1, explanation: "Changing places after the service hit is legal." })
      .mockResolvedValueOnce(verified);
    await expect(generateGroundedQuizQuestion({ ...indoorInput, rulesets: ["rallyball_6v6"] }))
      .resolves.toMatchObject({ answer: "Allow play to continue" });
    for (const call of vi.mocked(llmObject).mock.calls) {
      expect(call[0][0].content).not.toContain("Indoor position checks");
    }
  });
});
