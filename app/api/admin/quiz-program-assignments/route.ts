import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminFromRequest } from "../../../../lib/admin";
import { calculateQuizProgramStatus } from "../../../../lib/quiz-programs";
import { getServerSupabase } from "../../../../lib/supabase";

export const runtime = "nodejs";

const mutationSchema = z.object({
  action: z.enum(["assign", "remove"]),
  programId: z.string().uuid(),
  userIds: z.array(z.string().uuid()).min(1),
});

export async function GET(request: Request) {
  const admin = await requireAdminFromRequest(request);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
  const supabase = getServerSupabase();
  const [{ data: profiles, error: profileError }, { data: assignments, error: assignmentError }, { data: sessions, error: sessionError }] = await Promise.all([
    supabase.from("profiles").select("user_id, email, referee_level").order("email"),
    supabase.from("quiz_program_assignments").select("id, quiz_program_id, user_id, assigned_at, completed_at, program:quiz_programs(*)"),
    supabase.from("quiz_sessions").select("quiz_program_id, user_id, status, score_percent, passed, submitted_at, created_at").order("created_at", { ascending: false }),
  ]);
  const error = profileError || assignmentError || sessionError;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const enriched = (assignments || []).map((assignment) => {
    const program = Array.isArray(assignment.program) ? assignment.program[0] : assignment.program;
    const relevant = (sessions || []).filter((session) => session.quiz_program_id === assignment.quiz_program_id && session.user_id === assignment.user_id && session.status === "submitted");
    const passed = relevant.filter((session) => session.passed === true);
    const scores = relevant.map((session) => Number(session.score_percent || 0));
    return {
      ...assignment,
      program,
      completed_quizzes: passed.length,
      attempted_quizzes: relevant.length,
      average_score: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0,
      latest_score: scores[0] ?? null,
      passed_quizzes: passed.length,
      last_activity: relevant[0]?.submitted_at || relevant[0]?.created_at || assignment.assigned_at,
      status: calculateQuizProgramStatus({ completedQuizzes: passed.length, requiredQuizzes: program?.required_quiz_count || 1, dueAt: program?.due_at }),
    };
  });
  return NextResponse.json({ learners: profiles || [], assignments: enriched });
}

export async function POST(request: Request) {
  const admin = await requireAdminFromRequest(request);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
  const parsed = mutationSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid assignment request" }, { status: 400 });
  const supabase = getServerSupabase();
  if (parsed.data.action === "remove") {
    const { error } = await supabase.from("quiz_program_assignments").delete().eq("quiz_program_id", parsed.data.programId).in("user_id", parsed.data.userIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const rows = parsed.data.userIds.map((userId) => ({ quiz_program_id: parsed.data.programId, user_id: userId, assigned_by: admin.userId }));
    const { error } = await supabase.from("quiz_program_assignments").upsert(rows, { onConflict: "quiz_program_id,user_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
