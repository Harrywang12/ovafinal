import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserFromRequest } from "../../../lib/auth";
import { generatedQuizQuestionSchema } from "../../../lib/generated-quiz-question";
import { difficultyLabel, questionLevelForDifficulty } from "../../../lib/learning";
import { updateAdaptiveQuizStateAfterAnswer } from "../../../lib/quiz-adaptive";
import { markQuizAssignmentCompleteIfPassed } from "../../../lib/quiz-assignments";
import { recordQuizQuestionHistory } from "../../../lib/quiz-question-history";
import { getServerSupabase } from "../../../lib/supabase";
import { assertEnv } from "../../../lib/utils";

export const runtime = "nodejs";

const attemptSchema = z.object({ question_id: z.string().uuid(), selected_option: z.string().min(1) });

export async function POST(request: Request) {
  try {
    assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);
    const user = await requireUserFromRequest(request);
    if (!user.ok) return NextResponse.json({ error: user.error }, { status: user.status });
    const parsed = attemptSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid attempt" }, { status: 400 });

    const supabase = getServerSupabase();
    const { data: stored, error: lookupError } = await supabase.from("generated_quiz_questions")
      .select("id, question_data, answered_at").eq("id", parsed.data.question_id).eq("user_id", user.userId).maybeSingle();
    if (lookupError) throw lookupError;
    if (!stored) return NextResponse.json({ error: "Question not found" }, { status: 404 });
    if (stored.answered_at) return NextResponse.json({ error: "Question has already been answered" }, { status: 409 });

    const question = generatedQuizQuestionSchema.parse(stored.question_data);
    if (!question.options.includes(parsed.data.selected_option)) {
      return NextResponse.json({ error: "Selected answer is not a valid option" }, { status: 400 });
    }
    const correct = parsed.data.selected_option === question.answer;
    const { data: claimed, error: updateError } = await supabase.from("generated_quiz_questions")
      .update({ answered_at: new Date().toISOString() }).eq("id", stored.id).is("answered_at", null).select("id").maybeSingle();
    if (updateError) throw updateError;
    if (!claimed) return NextResponse.json({ error: "Question has already been answered" }, { status: 409 });
    const { error: attemptError } = await supabase.from("quiz_attempts").insert({
      user_id: user.userId, question, selected_option: parsed.data.selected_option, correct,
    });
    if (attemptError) throw attemptError;

    const adaptive = await updateAdaptiveQuizStateAfterAnswer(supabase, user.userId, user.refereeLevel, correct);
    const quizAssignment = await markQuizAssignmentCompleteIfPassed(supabase, user.userId);
    const { data: sourceDocument } = await supabase.from("rule_documents").select("title").eq("id", question.sourceDocumentId).maybeSingle();
    await recordQuizQuestionHistory({
      supabase, userId: user.userId, scope: "adaptive", question,
      questionLevel: questionLevelForDifficulty(adaptive.current_difficulty),
    });

    return NextResponse.json({
      ok: true, correct, answer: question.answer, explanation: question.explanation,
      ruleReference: question.ruleReference, sourceExcerpt: question.sourceExcerpt,
      sourceTitle: sourceDocument?.title || "Official rule source",
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
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to save attempt" }, { status: 500 });
  }
}
