import { NextResponse } from "next/server";
import { requireUserFromRequest } from "../../../lib/auth";
import { calculateQuizProgramStatus } from "../../../lib/quiz-programs";
import { getServerSupabase } from "../../../lib/supabase";
import { assertEnv } from "../../../lib/utils";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);
    const user = await requireUserFromRequest(request);
    if (!user.ok) return NextResponse.json({ error: user.error }, { status: user.status });
    const supabase = getServerSupabase();
    const { data: assignments, error } = await supabase.from("quiz_program_assignments")
      .select("id, assigned_at, completed_at, program:quiz_programs(*)")
      .eq("user_id", user.userId).order("assigned_at", { ascending: false });
    if (error) throw error;
    const { data: sessions, error: sessionError } = await supabase.from("quiz_sessions")
      .select("id, quiz_program_id, status, score_percent, passed, submitted_at, created_at")
      .eq("user_id", user.userId).order("created_at", { ascending: false });
    if (sessionError) throw sessionError;

    return NextResponse.json({
      assignments: (assignments || []).map((assignment) => {
        const program = Array.isArray(assignment.program) ? assignment.program[0] : assignment.program;
        const submitted = (sessions || []).filter((session) => session.quiz_program_id === program?.id && session.status === "submitted");
        return {
          id: assignment.id,
          assignedAt: assignment.assigned_at,
          completedAt: assignment.completed_at,
          program,
          completedQuizzes: submitted.length,
          status: calculateQuizProgramStatus({
            completedQuizzes: submitted.length,
            requiredQuizzes: program?.required_quiz_count || 1,
            dueAt: program?.due_at,
          }),
          sessions: (sessions || []).filter((session) => session.quiz_program_id === program?.id),
        };
      }),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load quiz programs" }, { status: 500 });
  }
}
