import type { SupabaseClient } from "@supabase/supabase-js";
import {
  initialDifficultyForRefereeLevel,
  nextAdaptiveDifficulty,
  type AdaptiveDifficulty,
  type RefereeLevel,
} from "./learning";

export type AdaptiveQuizState = {
  current_difficulty: AdaptiveDifficulty;
  correct_streak: number;
  incorrect_streak: number;
  updated_at: string | null;
};

function normalizeDifficulty(value: unknown): AdaptiveDifficulty {
  if (value === "easy" || value === "hard") return value;
  return "medium";
}

export async function getOrCreateAdaptiveQuizState(
  supabase: SupabaseClient,
  userId: string,
  refereeLevel: RefereeLevel
): Promise<AdaptiveQuizState> {
  const { data, error } = await supabase
    .from("quiz_adaptive_state")
    .select("current_difficulty, correct_streak, incorrect_streak, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (data) {
    return {
      current_difficulty: normalizeDifficulty(data.current_difficulty),
      correct_streak: Number(data.correct_streak) || 0,
      incorrect_streak: Number(data.incorrect_streak) || 0,
      updated_at: data.updated_at ?? null,
    };
  }

  const initialDifficulty = initialDifficultyForRefereeLevel(refereeLevel);
  const now = new Date().toISOString();
  const { error: insertError } = await supabase.from("quiz_adaptive_state").insert({
    user_id: userId,
    current_difficulty: initialDifficulty,
    correct_streak: 0,
    incorrect_streak: 0,
    updated_at: now,
  });

  if (insertError) throw insertError;

  return {
    current_difficulty: initialDifficulty,
    correct_streak: 0,
    incorrect_streak: 0,
    updated_at: now,
  };
}

export async function updateAdaptiveQuizStateAfterAnswer(
  supabase: SupabaseClient,
  userId: string,
  refereeLevel: RefereeLevel,
  correct: boolean
): Promise<AdaptiveQuizState> {
  const state = await getOrCreateAdaptiveQuizState(supabase, userId, refereeLevel);
  const rawCorrectStreak = correct ? state.correct_streak + 1 : 0;
  const rawIncorrectStreak = correct ? 0 : state.incorrect_streak + 1;
  const nextDifficulty = nextAdaptiveDifficulty(
    state.current_difficulty,
    rawCorrectStreak,
    rawIncorrectStreak
  );
  const changedDifficulty = nextDifficulty !== state.current_difficulty;
  const nextCorrectStreak = changedDifficulty ? 0 : rawCorrectStreak;
  const nextIncorrectStreak = changedDifficulty ? 0 : rawIncorrectStreak;
  const now = new Date().toISOString();

  const { error } = await supabase.from("quiz_adaptive_state").upsert(
    {
      user_id: userId,
      current_difficulty: nextDifficulty,
      correct_streak: nextCorrectStreak,
      incorrect_streak: nextIncorrectStreak,
      updated_at: now,
    },
    { onConflict: "user_id" }
  );

  if (error) throw error;

  return {
    current_difficulty: nextDifficulty,
    correct_streak: nextCorrectStreak,
    incorrect_streak: nextIncorrectStreak,
    updated_at: now,
  };
}
