import { describe, expect, it } from "vitest";
import { summarizeAssignedWork, toAdaptiveAssignedWork, type AssignedQuizProgram } from "../lib/assigned-work";

const adaptiveBase = {
  assigned: true,
  question_quota: 10,
  required_percent: 80,
  attempted: 4,
  correct: 3,
  score_percent: 75,
  remaining: 6,
  passed: false,
  completed_at: null,
  assigned_at: "2026-07-01T00:00:00.000Z",
};

function program(overrides: Partial<AssignedQuizProgram> = {}): AssignedQuizProgram {
  return {
    assignmentId: "assignment-1",
    programId: "program-1",
    title: "Indoor certification",
    discipline: "indoor",
    refereeLevel: "level_1",
    requiredPasses: 2,
    passedQuizzes: 1,
    attemptedQuizzes: 2,
    remainingPasses: 1,
    questionsPerQuiz: 10,
    minimumScorePercent: 80,
    startAt: null,
    dueAt: "2026-08-01T00:00:00.000Z",
    assignedAt: "2026-07-01T00:00:00.000Z",
    completedAt: null,
    status: "in_progress",
    sessions: [],
    ...overrides,
  };
}

describe("assigned work", () => {
  it("reports remaining adaptive questions", () => {
    expect(toAdaptiveAssignedWork(adaptiveBase)).toMatchObject({
      status: "in_progress",
      remainingQuestions: 6,
      scorePercent: 75,
    });
  });

  it("keeps a quota outstanding when the count is met but the score is low", () => {
    const adaptive = toAdaptiveAssignedWork({ ...adaptiveBase, attempted: 10, remaining: 0, score_percent: 70 });
    expect(adaptive.status).toBe("score_required");
    expect(summarizeAssignedWork(adaptive, []).outstandingCount).toBe(1);
  });

  it("combines adaptive questions and required passing quizzes", () => {
    const adaptive = toAdaptiveAssignedWork(adaptiveBase);
    expect(summarizeAssignedWork(adaptive, [program()])).toEqual({
      hasAssignments: true,
      hasOutstandingWork: true,
      outstandingCount: 7,
      nextDueAt: "2026-08-01T00:00:00.000Z",
    });
  });

  it("reports completion only after adaptive and program requirements pass", () => {
    const adaptive = toAdaptiveAssignedWork({ ...adaptiveBase, attempted: 10, correct: 9, score_percent: 90, remaining: 0, passed: true, completed_at: "2026-07-10T00:00:00.000Z" });
    const completeProgram = program({ passedQuizzes: 2, remainingPasses: 0, status: "completed", completedAt: "2026-07-10T00:00:00.000Z" });
    expect(summarizeAssignedWork(adaptive, [completeProgram])).toMatchObject({ hasOutstandingWork: false, outstandingCount: 0 });
  });
});
