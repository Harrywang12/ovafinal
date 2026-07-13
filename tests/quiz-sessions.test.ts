import { describe, expect, it } from "vitest";
import { gradeStoredAnswers, publicQuizQuestion } from "../lib/quiz-sessions";

const question = {
  question: "What is the ruling?", options: ["A", "B", "C", "D"], answer: "A", explanation: "Because the rule says so.",
  ruleReference: "Rule 1", discipline: "indoor", refereeLevel: "level_1", difficulty: "basic", topic: "service",
  subtopic: "authorization", ruleId: "1", scenarioType: "procedure", refereeRole: "first_referee", decisionType: "authorization",
  sourceDocumentId: "22222222-2222-4222-8222-222222222222", sourceChunkIds: ["11111111-1111-4111-8111-111111111111"],
  sourceExcerpt: "This official excerpt is long enough to validate.",
};
const rows = [{ id: "33333333-3333-4333-8333-333333333333", sequence_number: 1, question_data: question }];

describe("quiz session grading", () => {
  it("hides frozen answers from the learner payload", () => {
    const visible = publicQuizQuestion(rows[0]);
    expect(visible).not.toHaveProperty("answer");
    expect(visible).not.toHaveProperty("explanation");
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
});
