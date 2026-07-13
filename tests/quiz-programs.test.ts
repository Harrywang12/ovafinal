import { describe, expect, it } from "vitest";
import { allocateDifficulties, calculateQuizProgramStatus, getDifficultyMix, quizProgramInputSchema } from "../lib/quiz-programs";

const base = {
  title: "Beach Level 1",
  discipline: "beach",
  refereeLevel: "level_1",
  requiredQuizCount: 2,
  questionsPerQuiz: 2,
  minimumScorePercent: 70,
  topicBlueprint: [{ topic: "service", count: 2 }],
  difficultyProgression: [{ throughQuiz: null, mix: { basic: 0.5, applied: 0.5, advanced: 0 } }],
};

describe("quiz programs", () => {
  it("validates blueprint totals", () => {
    expect(quizProgramInputSchema.safeParse(base).success).toBe(true);
    expect(quizProgramInputSchema.safeParse({ ...base, questionsPerQuiz: 3 }).success).toBe(false);
  });

  it("rejects Level 2 competencies from a Level 1 blueprint", () => {
    expect(quizProgramInputSchema.safeParse({ ...base, topicBlueprint: [{ topic: "second_referee_positioning", count: 2 }] }).success).toBe(false);
  });

  it("uses progressive difficulty without changing referee level", () => {
    expect(getDifficultyMix(1)).toEqual({ basic: 0.8, applied: 0.2, advanced: 0 });
    expect(getDifficultyMix(8)).toEqual({ basic: 0.5, applied: 0.5, advanced: 0 });
    expect(allocateDifficulties(10, getDifficultyMix(12))).toHaveLength(10);
  });

  it("calculates not-started, in-progress, completed, and overdue status", () => {
    const now = new Date("2026-07-12T12:00:00Z");
    expect(calculateQuizProgramStatus({ completedQuizzes: 0, requiredQuizzes: 2, now })).toBe("not_started");
    expect(calculateQuizProgramStatus({ completedQuizzes: 1, requiredQuizzes: 2, now })).toBe("in_progress");
    expect(calculateQuizProgramStatus({ completedQuizzes: 2, requiredQuizzes: 2, now })).toBe("completed");
    expect(calculateQuizProgramStatus({ completedQuizzes: 0, requiredQuizzes: 2, dueAt: "2026-07-11T12:00:00Z", now })).toBe("overdue");
  });
});
