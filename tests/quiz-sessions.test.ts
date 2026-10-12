import { describe, expect, it } from "vitest";
import { gradeStoredAnswers, isStaleGeneratingSession, publicQuizQuestion, STALE_GENERATION_MS } from "../lib/quiz-sessions";

const question = {
  question: "What is the ruling?", options: ["A", "B", "C", "D"], answer: "A", explanation: "Because the rule says so.",
  ruleReference: "Rule 1", discipline: "indoor", refereeLevel: "level_1", difficulty: "basic", topic: "service",
  subtopic: "service_authorization", ruleId: "1", scenarioType: "service_readiness_check", refereeRole: "first_referee", decisionType: "authorize_service",
  questionStyle: "referee_ruling",
  sourceDocumentId: "22222222-2222-4222-8222-222222222222", sourceChunkIds: ["11111111-1111-4111-8111-111111111111"],
  sourceExcerpt: "This official excerpt is long enough to validate.",
};
const rows = [{ id: "33333333-3333-4333-8333-333333333333", sequence_number: 1, question_data: question }];

describe("quiz session grading", () => {
  it("hides frozen answers from the learner payload", () => {
    const visible = publicQuizQuestion(rows[0]);
    expect(visible).not.toHaveProperty("answer");
    expect(visible).not.toHaveProperty("explanation");
    expect(visible).not.toHaveProperty("sourceExcerpt");
    expect(visible).not.toHaveProperty("sourceChunkIds");
    expect(visible).not.toHaveProperty("sourceDocumentId");
    expect(question.answer).toBe("A");
  });

  it("grades selected answers against stored server data", () => {
    expect(gradeStoredAnswers(rows, [{ questionId: rows[0].id, selectedAnswer: "A" }])).toMatchObject({ correctCount: 1, scorePercent: 100 });
    expect(gradeStoredAnswers(rows, [{ questionId: rows[0].id, selectedAnswer: "B" }])).toMatchObject({ correctCount: 0, scorePercent: 0 });
  });

  it("requires every stored question and rejects invalid options", () => {
    expect(() => gradeStoredAnswers(rows, [])).toThrow(/every/i);
    expect(() => gradeStoredAnswers(rows, [{ questionId: rows[0].id, selectedAnswer: "Forged" }])).toThrow(/invalid/i);
  });

  it("treats only long-running generating sessions as stale", () => {
    const now = Date.parse("2026-10-12T12:00:00Z");
    const createdAt = (ageMs: number) => new Date(now - ageMs).toISOString();
    expect(isStaleGeneratingSession({ status: "generating", created_at: createdAt(STALE_GENERATION_MS + 1) }, now)).toBe(true);
    expect(isStaleGeneratingSession({ status: "generating", created_at: createdAt(60_000) }, now)).toBe(false);
    expect(isStaleGeneratingSession({ status: "ready", created_at: createdAt(STALE_GENERATION_MS * 10) }, now)).toBe(false);
  });
});
