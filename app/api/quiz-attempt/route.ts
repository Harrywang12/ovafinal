import { NextResponse } from "next/server";
import { requireUserFromRequest } from "../../../lib/auth";
import { difficultyLabel, questionLevelForDifficulty } from "../../../lib/learning";
import { markQuizAssignmentCompleteIfPassed } from "../../../lib/quiz-assignments";
import { updateAdaptiveQuizStateAfterAnswer } from "../../../lib/quiz-adaptive";
import { recordQuizQuestionHistory } from "../../../lib/quiz-question-history";
import { getServerSupabase } from "../../../lib/supabase";
import { assertEnv } from "../../../lib/utils";

export const runtime = "nodejs";

function questionLevelFromPayload(question: unknown) {
  const value = (question as { question_level?: unknown } | null)?.question_level;
  return value === "beginner" || value === "intermediate" || value === "hard" ? value : null;
}

export async function POST(request: Request) {
  assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);
  const user = await requireUserFromRequest(request);
  if (!user.ok) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }

  const body = await request.json();
  const { question, selected_option, correct } = body;
  if (!question || selected_option === undefined) {
    return NextResponse.json({ error: "question and selected_option required" }, { status: 400 });
  }
  if (typeof correct !== "boolean") {
    return NextResponse.json({ error: "correct boolean required" }, { status: 400 });
  }

  const supabase = getServerSupabase();
  const { error } = await supabase.from("quiz_attempts").insert({
    user_id: user.userId,
    question,
    selected_option,
    correct
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    const adaptive = await updateAdaptiveQuizStateAfterAnswer(
      supabase,
      user.userId,
      user.refereeLevel,
      correct
    );
    const quizAssignment = await markQuizAssignmentCompleteIfPassed(supabase, user.userId);
    await recordQuizQuestionHistory({
      supabase,
      userId: user.userId,
      scope: "adaptive",
      questionLevel: questionLevelFromPayload(question),
      question,
    });
    return NextResponse.json({
      ok: true,
      adaptive_state: {
        current_difficulty: adaptive.current_difficulty,
        difficulty_label: difficultyLabel(adaptive.current_difficulty),
        question_level: questionLevelForDifficulty(adaptive.current_difficulty),
        correct_streak: adaptive.correct_streak,
        incorrect_streak: adaptive.incorrect_streak,
        updated_at: adaptive.updated_at,
      },
      quiz_assignment: quizAssignment,
    });
  } catch (stateError) {
    return NextResponse.json({ error: (stateError as Error).message }, { status: 500 });
  }
}
