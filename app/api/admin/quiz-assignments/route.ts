import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "../../../../lib/admin";
import { normalizeRefereeLevel } from "../../../../lib/learning";
import {
  emptyQuizAssignmentProgress,
  summarizeQuizAssignment,
  type QuizAssignmentRow,
} from "../../../../lib/quiz-assignments";
import { getServerSupabase } from "../../../../lib/supabase";
import { groupBy, selectAllRows } from "../../../../lib/supabase-pagination";
import { assertEnv } from "../../../../lib/utils";

export const runtime = "nodejs";

type ProfileRow = {
  user_id: string;
  email: string | null;
  referee_level: string | null;
};

export async function GET(request: Request) {
  assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);
  const admin = await requireAdminFromRequest(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const supabase = getServerSupabase();
  try {
    const [profiles, assignments] = await Promise.all([
      selectAllRows<ProfileRow>((from, to) => supabase
        .from("profiles")
        .select("user_id, email, referee_level")
        .order("email", { ascending: true })
        .order("user_id")
        .range(from, to)),
      selectAllRows<QuizAssignmentRow>((from, to) => supabase
        .from("quiz_assignments")
        .select("user_id, question_quota, required_percent, assigned_at, completed_at")
        .order("user_id")
        .range(from, to)),
    ]);

    // One bulk read of attempts for assigned learners instead of two
    // queries per learner.
    const assignmentByUser = new Map(assignments.map((row) => [row.user_id, row]));
    const earliestAssignedAt = assignments.map((row) => row.assigned_at).sort()[0];
    const attempts = assignments.length
      ? await selectAllRows<{ id: string; user_id: string; correct: boolean | null; created_at: string }>((from, to) => supabase
        .from("quiz_attempts")
        .select("id, user_id, correct, created_at")
        .gte("created_at", earliestAssignedAt)
        .order("id")
        .range(from, to))
      : [];
    const attemptsByUser = groupBy(attempts, (attempt) => attempt.user_id);

    const learners = profiles.map((profile) => {
      const assignment = assignmentByUser.get(profile.user_id);
      const counted = (attemptsByUser.get(profile.user_id) || [])
        .filter((attempt) => assignment && Date.parse(attempt.created_at) >= Date.parse(assignment.assigned_at));
      return {
        user_id: profile.user_id,
        email: profile.email,
        referee_level: normalizeRefereeLevel(profile.referee_level),
        quiz_assignment: assignment
          ? summarizeQuizAssignment(assignment, counted.length, counted.filter((attempt) => attempt.correct === true).length)
          : emptyQuizAssignmentProgress(),
      };
    });

    return NextResponse.json({ learners });
  } catch (progressError) {
    return NextResponse.json({ error: (progressError as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);
  const admin = await requireAdminFromRequest(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  let body: {
    action?: "assign" | "clear";
    user_ids?: string[];
    question_quota?: number;
    required_percent?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = body.action;
  const userIds = Array.isArray(body.user_ids) ? Array.from(new Set(body.user_ids.filter(Boolean))) : [];
  const questionQuota = Math.floor(Number(body.question_quota));
  const requiredPercent = Math.floor(Number(body.required_percent));

  if (action !== "assign" && action !== "clear") {
    return NextResponse.json({ error: "action must be assign or clear" }, { status: 400 });
  }
  if (userIds.length === 0) {
    return NextResponse.json({ error: "user_ids are required" }, { status: 400 });
  }

  const supabase = getServerSupabase();

  if (action === "clear") {
    const { error } = await supabase.from("quiz_assignments").delete().in("user_id", userIds);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (!Number.isFinite(questionQuota) || questionQuota <= 0) {
    return NextResponse.json({ error: "question_quota must be greater than 0" }, { status: 400 });
  }
  if (!Number.isFinite(requiredPercent) || requiredPercent < 1 || requiredPercent > 100) {
    return NextResponse.json({ error: "required_percent must be between 1 and 100" }, { status: 400 });
  }

  const rows = userIds.map((userId) => ({
    user_id: userId,
    question_quota: questionQuota,
    required_percent: requiredPercent,
    assigned_by: admin.userId,
    assigned_at: new Date().toISOString(),
    completed_at: null,
  }));

  const { error } = await supabase
    .from("quiz_assignments")
    .upsert(rows, { onConflict: "user_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
