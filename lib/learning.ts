import type { Module } from "./module-content";

export const MODULE_PASS_QUESTION_REQUIREMENT = 10;
export const MODULE_PASS_CORRECT_REQUIREMENT = 7;
export const MODULE_PASS_PERCENT = 70;

export type RefereeLevel = "level_1" | "level_2" | "level_3" | "level_4";
export type QuestionLevel = "beginner" | "intermediate" | "hard";
export type AdaptiveDifficulty = "easy" | "medium" | "hard";

export type ModuleStatus = "not_started" | "in_progress" | "passed";

export type ModuleProgressSummary = {
  module_id: string;
  title: string;
  lesson_count: number;
  lessons_viewed: number;
  attempts: number;
  latest_attempts_count: number;
  latest_correct_count: number;
  latest_score_percent: number;
  passed: boolean;
  assigned: boolean;
  passed_at: string | null;
  status: ModuleStatus;
  last_activity_at: string | null;
};

export type LearningProgressResponse = {
  profile: {
    user_id: string;
    email: string | null;
    referee_level: RefereeLevel;
    question_level: QuestionLevel;
  };
  requirements: {
    question_count: number;
    correct_count: number;
    percent: number;
  };
  modules: ModuleProgressSummary[];
};

export function normalizeRefereeLevel(value: unknown): RefereeLevel {
  if (value === "level_2_plus") return "level_2";
  if (value === "level_2" || value === "level_3" || value === "level_4") return value;
  return "level_1";
}

export function questionLevelForRefereeLevel(level: RefereeLevel): QuestionLevel {
  if (level === "level_1") return "beginner";
  if (level === "level_2") return "intermediate";
  return "hard";
}

export function initialDifficultyForRefereeLevel(level: RefereeLevel): AdaptiveDifficulty {
  if (level === "level_1") return "easy";
  if (level === "level_2") return "medium";
  return "hard";
}

export function questionLevelForDifficulty(difficulty: AdaptiveDifficulty): QuestionLevel {
  if (difficulty === "easy") return "beginner";
  if (difficulty === "medium") return "intermediate";
  return "hard";
}

export function difficultyLabel(difficulty: AdaptiveDifficulty): string {
  if (difficulty === "medium") return "Intermediate";
  return difficulty[0].toUpperCase() + difficulty.slice(1);
}

export function nextAdaptiveDifficulty(
  currentDifficulty: AdaptiveDifficulty,
  correctStreak: number,
  incorrectStreak: number
): AdaptiveDifficulty {
  const order: AdaptiveDifficulty[] = ["easy", "medium", "hard"];
  const index = order.indexOf(currentDifficulty);
  if (correctStreak >= 2) {
    return order[Math.min(order.length - 1, index + 1)];
  }
  if (incorrectStreak >= 2) {
    return order[Math.max(0, index - 1)];
  }
  return currentDifficulty;
}

export function refereeLevelLabel(level: RefereeLevel): string {
  return `Level ${level.replace("level_", "")}`;
}

export function questionLevelLabel(level: QuestionLevel): string {
  if (level === "beginner") return "Beginner";
  if (level === "intermediate") return "Intermediate";
  return "Hard";
}

export function calculateLatestScore(
  attempts: Array<{ correct: boolean | null; created_at?: string | null }>
) {
  const latest = attempts.slice(0, MODULE_PASS_QUESTION_REQUIREMENT);
  const latestAttemptsCount = latest.length;
  const latestCorrectCount = latest.filter((a) => a.correct === true).length;
  const latestScorePercent = latestAttemptsCount
    ? Math.round((latestCorrectCount / latestAttemptsCount) * 100)
    : 0;
  const meetsPassRequirement =
    latestAttemptsCount >= MODULE_PASS_QUESTION_REQUIREMENT &&
    latestCorrectCount >= MODULE_PASS_CORRECT_REQUIREMENT;

  return {
    latestAttemptsCount,
    latestCorrectCount,
    latestScorePercent,
    meetsPassRequirement,
  };
}

export function getModuleLessonCount(module: Module): number {
  return module.lessons.length;
}
