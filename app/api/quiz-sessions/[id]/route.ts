import { NextResponse } from "next/server";
import { requireUserFromRequest } from "../../../../lib/auth";
import { publicQuizQuestion } from "../../../../lib/quiz-sessions";
import { getServerSupabase } from "../../../../lib/supabase";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserFromRequest(request);
    if (!user.ok) return NextResponse.json({ error: user.error }, { status: user.status });
    const { id } = await params;
    const supabase = getServerSupabase();
    const { data: session, error } = await supabase.from("quiz_sessions").select("*").eq("id", id).eq("user_id", user.userId).maybeSingle();
    if (error) throw error;
    if (!session) return NextResponse.json({ error: "Quiz session not found" }, { status: 404 });
    const { data: questions, error: questionError } = await supabase.from("quiz_session_questions")
      .select("id, sequence_number, question_data").eq("quiz_session_id", id).order("sequence_number");
    if (questionError) throw questionError;
    return NextResponse.json({ session, questions: (questions || []).map(publicQuizQuestion) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load quiz session" }, { status: 500 });
  }
}
