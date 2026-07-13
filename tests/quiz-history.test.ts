import { describe, expect, it } from "vitest";
import { assessStructuredRepetition, normalizeQuizQuestionText, quizQuestionSignature } from "../lib/quiz-question-history";

describe("question history", () => {
  it("normalizes punctuation and produces stable signatures", () => {
    expect(normalizeQuizQuestionText("  Net-contact: Fault? ")).toBe("net contact fault");
    expect(quizQuestionSignature("Net contact fault")).toBe(quizQuestionSignature("NET-contact fault!"));
  });

  it("rejects recently repeated rule and scenario concepts", () => {
    const history = [{ questionText: "Previous", ruleId: "12.4", scenarioType: "service_fault" }];
    expect(assessStructuredRepetition(history, { ruleId: "12.4" })?.reason).toBe("rule");
    expect(assessStructuredRepetition(history, { scenarioType: "service_fault" })?.reason).toBe("scenario");
  });
});
