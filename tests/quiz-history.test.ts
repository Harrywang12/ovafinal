import { describe, expect, it } from "vitest";
import {
  assessStructuredRepetition,
  calculateNoveltyPenalty,
  conceptFingerprint,
  normalizeQuizQuestionText,
  quizQuestionSignature,
  sourceFactFingerprint,
} from "../lib/quiz-question-history";

const metadata = {
  ruleId: "12.4",
  scenarioType: "service_after_authorization",
  decisionType: "service_execution_ruling",
  refereeRole: "first_referee",
  questionStyle: "referee_ruling",
  sourceExcerpt: "The server must hit the ball within the permitted service time.",
  sourceChunkIds: ["chunk-a"],
};

describe("question history", () => {
  it("normalizes punctuation and produces stable signatures", () => {
    expect(normalizeQuizQuestionText("  Net-contact: Fault? ")).toBe("net contact fault");
    expect(quizQuestionSignature("Net contact fault")).toBe(quizQuestionSignature("NET-contact fault!"));
  });

  it("allows a rule to be reused when its source fact and concept are different", () => {
    const history = [{
      questionText: "Previous",
      ...metadata,
      sourceExcerpt: "The first referee authorizes the service.",
      scenarioType: "authorization_readiness_check",
      decisionType: "authorize_or_delay_service",
      sourceFactFingerprint: sourceFactFingerprint({ ...metadata, sourceExcerpt: "The first referee authorizes the service." }),
      conceptFingerprint: conceptFingerprint({ ...metadata, scenarioType: "authorization_readiness_check", decisionType: "authorize_or_delay_service" }),
    }];
    expect(assessStructuredRepetition(history, metadata)).toBeNull();
  });

  it("blocks a recently repeated source fact and composite concept", () => {
    const sourceHistory = [{ questionText: "Previous", ...metadata, sourceFactFingerprint: sourceFactFingerprint(metadata) }];
    expect(assessStructuredRepetition(sourceHistory, metadata)?.reason).toBe("source_fact");

    const conceptHistory = [{
      questionText: "Previous",
      ...metadata,
      sourceExcerpt: "A different official source fact.",
      sourceFactFingerprint: sourceFactFingerprint({ sourceExcerpt: "A different official source fact." }),
      conceptFingerprint: conceptFingerprint(metadata),
    }];
    expect(assessStructuredRepetition(conceptHistory, metadata)?.reason).toBe("concept");
  });

  it("penalizes recent dimensions without treating one repeated field as a duplicate", () => {
    const history = [{ questionText: "Previous", ...metadata }];
    expect(calculateNoveltyPenalty(history, { ...metadata, sourceExcerpt: "A new source fact." }, 0.4)).toBeGreaterThan(0.4);
  });

  it("supports 1,000 varied concepts under the same rule without artificial exhaustion", () => {
    const history = Array.from({ length: 1000 }, (_, index) => ({
      questionText: `Question ${index}`,
      ...metadata,
      scenarioType: `service_scenario_${index}`,
      decisionType: `service_decision_${index}`,
      sourceExcerpt: `Official source fact number ${index} for this simulation.`,
    }));
    const next = {
      ...metadata,
      scenarioType: "service_scenario_1000",
      decisionType: "service_decision_1000",
      sourceExcerpt: "Official source fact number 1000 for this simulation.",
    };
    expect(assessStructuredRepetition(history, next)).toBeNull();
  });
});
