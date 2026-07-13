import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserFromRequest } from "../../../lib/auth";
import { getServerSupabase } from "../../../lib/supabase";

const schema = z.object({
  quizSessionQuestionId: z.string().uuid().optional(),
  generatedQuizQuestionId: z.string().uuid().optional(),
  reason: z.enum(["incorrect_answer", "ambiguous_wording", "incorrect_rule_reference", "outside_referee_level", "duplicate_question", "technical_issue", "other"]),
  comment: z.string().trim().max(1000).optional(),
}).refine((value) => value.quizSessionQuestionId || value.generatedQuizQuestionId, { message: "A question ID is required" });

export async function POST(request: Request) {
  const user = await requireUserFromRequest(request);
  if (!user.ok) return NextResponse.json({ error: user.error }, { status: user.status });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid report" }, { status: 400 });
  const supabase = getServerSupabase();
  if (parsed.data.generatedQuizQuestionId) {
    const { data } = await supabase.from("generated_quiz_questions").select("id").eq("id", parsed.data.generatedQuizQuestionId).eq("user_id", user.userId).maybeSingle();
    if (!data) return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }
  if (parsed.data.quizSessionQuestionId) {
    const { data } = await supabase.from("quiz_session_questions").select("id, session:quiz_sessions!inner(user_id)").eq("id", parsed.data.quizSessionQuestionId).eq("session.user_id", user.userId).maybeSingle();
    if (!data) return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }
  const { data, error } = await supabase.from("quiz_question_flags").insert({
    user_id: user.userId,
    quiz_session_question_id: parsed.data.quizSessionQuestionId || null,
    generated_quiz_question_id: parsed.data.generatedQuizQuestionId || null,
    reason: parsed.data.reason,
    comment: parsed.data.comment || null,
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
