import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserFromRequest } from "../../../../../lib/auth";
import { recordQuizQuestionHistory } from "../../../../../lib/quiz-question-history";
import { gradeStoredAnswers } from "../../../../../lib/quiz-sessions";
import { getServerSupabase } from "../../../../../lib/supabase";

export const runtime = "nodejs";

const inputSchema = z.object({ answers: z.array(z.object({ questionId: z.string().uuid(), selectedAnswer: z.string().min(1) })).min(1) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let claimedSessionId: string | null = null;
  try {
    const user = await requireUserFromRequest(request);
    if (!user.ok) return NextResponse.json({ error: user.error }, { status: user.status });
    const body = inputSchema.safeParse(await request.json().catch(() => ({})));
    if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message || "Invalid answers" }, { status: 400 });
    const { id } = await params;
    const supabase = getServerSupabase();
    const { data: session, error } = await supabase.from("quiz_sessions")
      .select("*, program:quiz_programs(minimum_score_percent, required_quiz_count)")
      .eq("id", id).eq("user_id", user.userId).maybeSingle();
    if (error) throw error;
    if (!session) return NextResponse.json({ error: "Quiz session not found" }, { status: 404 });
    if (!["ready", "in_progress"].includes(session.status)) return NextResponse.json({ error: "Quiz session cannot be submitted" }, { status: 409 });

    const { data: questions, error: questionError } = await supabase.from("quiz_session_questions")
      .select("id, sequence_number, question_data").eq("quiz_session_id", id).order("sequence_number");
    if (questionError) throw questionError;
    const result = gradeStoredAnswers(questions || [], body.data.answers);
    const program = Array.isArray(session.program) ? session.program[0] : session.program;
    const passed = result.scorePercent >= Number(program.minimum_score_percent);
    const { data: claimed, error: claimError } = await supabase.from("quiz_sessions")
      .update({ status: "submitting" })
      .eq("id", id)
      .eq("user_id", user.userId)
      .in("status", ["ready", "in_progress"])
      .select("id")
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) return NextResponse.json({ error: "Quiz session has already been submitted" }, { status: 409 });
    claimedSessionId = id;
    const { error: answerError } = await supabase.from("quiz_session_answers").insert(result.graded.map((item) => ({
      quiz_session_question_id: item.questionId,
      user_id: user.userId,
      selected_answer: item.selectedAnswer,
      correct: item.correct,
    })));
    if (answerError) throw answerError;
    const submittedAt = new Date().toISOString();
    const { error: sessionError } = await supabase.from("quiz_sessions").update({
      status: "submitted", submitted_at: submittedAt, score_percent: result.scorePercent, passed,
    }).eq("id", id).eq("user_id", user.userId).eq("status", "submitting");
    if (sessionError) throw sessionError;

    for (const item of result.graded) {
      await recordQuizQuestionHistory({
        supabase, userId: user.userId, scope: "program", question: item.question, quizSessionId: id,
      });
    }
    claimedSessionId = null;
    const { count, error: countError } = await supabase.from("quiz_sessions").select("id", { count: "exact", head: true })
      .eq("quiz_program_id", session.quiz_program_id).eq("user_id", user.userId).eq("status", "submitted").eq("passed", true);
    if (countError) throw countError;
    if ((count || 0) >= Number(program.required_quiz_count) && session.quiz_program_assignment_id) {
      await supabase.from("quiz_program_assignments").update({ completed_at: submittedAt })
        .eq("id", session.quiz_program_assignment_id).eq("user_id", user.userId);
    }
    const documentIds = Array.from(new Set(result.graded.map((item) => item.question.sourceDocumentId)));
    const { data: sourceDocuments } = await supabase.from("rule_documents").select("id, title").in("id", documentIds);
    const sourceTitleById = new Map((sourceDocuments || []).map((document) => [document.id, document.title]));

    return NextResponse.json({
      scorePercent: result.scorePercent,
      correctCount: result.correctCount,
      questionCount: result.graded.length,
      passed,
      answers: result.graded.map((item) => ({
        questionId: item.questionId, selectedAnswer: item.selectedAnswer, correct: item.correct,
        answer: item.question.answer, explanation: item.question.explanation,
        ruleReference: item.question.ruleReference, sourceExcerpt: item.question.sourceExcerpt,
        sourceTitle: sourceTitleById.get(item.question.sourceDocumentId) || "Official rule source",
      })),
    });
  } catch (error) {
    if (claimedSessionId) {
      await getServerSupabase().from("quiz_sessions").update({ status: "ready" })
        .eq("id", claimedSessionId).eq("status", "submitting");
    }
    const status = error instanceof Error && /answered|selected answer|exactly once/i.test(error.message) ? 400 : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to submit quiz" }, { status });
  }
}
