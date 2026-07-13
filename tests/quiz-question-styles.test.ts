import { describe, expect, it } from "vitest";
import { selectQuestionStyles } from "../lib/quiz-question-styles";

describe("question style scheduling", () => {
  it("selects unique compatible styles and moves a recent style later", () => {
    const history = [{ questionText: "Previous", questionStyle: "referee_ruling" }];
    const styles = selectQuestionStyles("service_and_service_order", "basic", 4, history, 0, () => 0.5);
    expect(new Set(styles).size).toBe(4);
    expect(styles[0]).not.toBe("referee_ruling");
    expect(selectQuestionStyles("service_and_service_order", "basic", 8, history, 0, () => 0.5)).toContain("position_rotation_analysis");
  });

  it("adds sanction and exception styles only when the context supports them", () => {
    const styles = selectQuestionStyles("misconduct", "applied", 8, [], 0, () => 0.5);
    expect(styles).toContain("sanction_consequence");
    expect(styles).toContain("rule_exception");
  });
});
