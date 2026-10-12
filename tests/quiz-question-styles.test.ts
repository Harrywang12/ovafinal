import { describe, expect, it } from "vitest";
import { compatibleQuestionStyles } from "../lib/quiz-question-styles";

describe("question style compatibility", () => {
  it("offers rotation analysis only for service and positioning topics", () => {
    expect(compatibleQuestionStyles("service_and_service_order", "basic")).toContain("position_rotation_analysis");
    expect(compatibleQuestionStyles("misconduct", "basic")).not.toContain("position_rotation_analysis");
  });

  it("adds sanction and exception styles only when the context supports them", () => {
    const styles = compatibleQuestionStyles("misconduct", "applied");
    expect(styles).toContain("sanction_consequence");
    expect(styles).toContain("rule_exception");
    expect(compatibleQuestionStyles("misconduct", "basic")).not.toContain("rule_exception");
  });
});
