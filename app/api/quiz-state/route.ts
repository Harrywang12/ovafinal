import { NextResponse } from "next/server";
import { requireUserFromRequest } from "../../../lib/auth";
import { difficultyLabel, initialDifficultyForRefereeLevel, questionLevelForDifficulty } from "../../../lib/learning";
import { getQuizAssignmentProgress } from "../../../lib/quiz-assignments";
import { getOrCreateAdaptiveQuizState } from "../../../lib/quiz-adaptive";
import { getServerSupabase } from "../../../lib/supabase";
import { assertEnv } from "../../../lib/utils";

export const runtime = "nodejs";

export async function GET(request: Request) {
  assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);
  const user = await requireUserFromRequest(request);
  if (!user.ok) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }

  const supabase = getServerSupabase();
  try {
    const state = await getOrCreateAdaptiveQuizState(supabase, user.userId, user.refereeLevel);
    const quiz_assignment = await getQuizAssignmentProgress(supabase, user.userId);
    return NextResponse.json({
      referee_level: user.refereeLevel,
      initial_difficulty: initialDifficultyForRefereeLevel(user.refereeLevel),
      current_difficulty: state.current_difficulty,
      difficulty_label: difficultyLabel(state.current_difficulty),
      question_level: questionLevelForDifficulty(state.current_difficulty),
      correct_streak: state.correct_streak,
      incorrect_streak: state.incorrect_streak,
      updated_at: state.updated_at,
      quiz_assignment,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
