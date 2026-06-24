import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "../../../../lib/admin";
import {
  calculateLatestScore,
  normalizeRefereeLevel,
  questionLevelForRefereeLevel,
} from "../../../../lib/learning";
import { getAllModules } from "../../../../lib/module-content";
import { getServerSupabase } from "../../../../lib/supabase";
import { assertEnv } from "../../../../lib/utils";

export const runtime = "nodejs";

type ProfileRow = {
  user_id: string;
  email: string | null;
  referee_level: string | null;
  created_at: string | null;
};

type LessonRow = {
  user_id: string;
  module_id: string;
  lesson_id: string;
  viewed_at: string | null;
};

type AttemptRow = {
  user_id: string;
  module_id: string;
  correct: boolean;
  created_at: string | null;
};

type PassRow = {
  user_id: string;
  module_id: string;
  score_percent: number;
  passed_at: string | null;
};

type AssignmentRow = {
  user_id: string;
  module_id: string;
};

function later(a: string | null, b: string | null) {
  if (!a) return b;
  if (!b) return a;
  return Date.parse(a) >= Date.parse(b) ? a : b;
}

export async function GET(request: Request) {
  assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);
  const admin = await requireAdminFromRequest(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const supabase = getServerSupabase();
  const [{ data: profiles, error: profileError }, { data: lessons, error: lessonError }, { data: attempts, error: attemptError }, { data: passes, error: passError }, { data: assignments, error: assignmentError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, email, referee_level, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("module_lesson_progress").select("user_id, module_id, lesson_id, viewed_at").limit(20000),
      supabase.from("module_quiz_attempts").select("user_id, module_id, correct, created_at").order("created_at", { ascending: false }).limit(20000),
      supabase.from("module_passes").select("user_id, module_id, score_percent, passed_at").limit(20000),
      supabase.from("module_assignments").select("user_id, module_id").limit(20000),
    ]);

  const error = profileError || lessonError || attemptError || passError || assignmentError;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const allModules = getAllModules();
  const moduleCount = allModules.length;
  const lessonsByUser = new Map<string, LessonRow[]>();
  const attemptsByUser = new Map<string, AttemptRow[]>();
  const passesByUser = new Map<string, PassRow[]>();
  const assignmentsByUser = new Map<string, AssignmentRow[]>();

  for (const row of (lessons || []) as LessonRow[]) {
    lessonsByUser.set(row.user_id, [...(lessonsByUser.get(row.user_id) || []), row]);
  }
  for (const row of (attempts || []) as AttemptRow[]) {
    attemptsByUser.set(row.user_id, [...(attemptsByUser.get(row.user_id) || []), row]);
  }
  for (const row of (passes || []) as PassRow[]) {
    passesByUser.set(row.user_id, [...(passesByUser.get(row.user_id) || []), row]);
  }
  for (const row of (assignments || []) as AssignmentRow[]) {
    assignmentsByUser.set(row.user_id, [...(assignmentsByUser.get(row.user_id) || []), row]);
  }

  const learners = ((profiles || []) as ProfileRow[]).map((profile) => {
    const userLessons = lessonsByUser.get(profile.user_id) || [];
    const userAttempts = attemptsByUser.get(profile.user_id) || [];
    const userPasses = passesByUser.get(profile.user_id) || [];
    const userAssignments = assignmentsByUser.get(profile.user_id) || [];
    const startedModules = new Set([
      ...userLessons.map((l) => l.module_id),
      ...userAttempts.map((a) => a.module_id),
    ]);

    const correctCount = userAttempts.filter((a) => a.correct).length;
    const averageScore = userAttempts.length ? Math.round((correctCount / userAttempts.length) * 100) : 0;
    const lastLessonActivity = userLessons.reduce<string | null>((acc, row) => later(acc, row.viewed_at), null);
    const lastAttemptActivity = userAttempts.reduce<string | null>((acc, row) => later(acc, row.created_at), null);
    const lastPassActivity = userPasses.reduce<string | null>((acc, row) => later(acc, row.passed_at), null);
    const refereeLevel = normalizeRefereeLevel(profile.referee_level);

    const moduleScores = allModules.map((module) => {
      const moduleAttempts = userAttempts.filter((a) => a.module_id === module.id);
      const latest = calculateLatestScore(moduleAttempts);
      const pass = userPasses.find((p) => p.module_id === module.id);
      return {
        module_id: module.id,
        title: module.title,
        attempts: moduleAttempts.length,
        latest_score_percent: pass?.score_percent ?? latest.latestScorePercent,
        assigned: userAssignments.some((assignment) => assignment.module_id === module.id),
        passed: !!pass,
      };
    });
    const assignedPassed = userAssignments.filter((assignment) =>
      userPasses.some((pass) => pass.module_id === assignment.module_id)
    ).length;

    return {
      user_id: profile.user_id,
      email: profile.email,
      referee_level: refereeLevel,
      question_level: questionLevelForRefereeLevel(refereeLevel),
      modules_started: startedModules.size,
      modules_passed: userPasses.length,
      assigned_modules: userAssignments.length,
      assigned_modules_passed: assignedPassed,
      total_modules: moduleCount,
      attempts: userAttempts.length,
      average_score_percent: averageScore,
      last_activity_at: later(later(lastLessonActivity, lastAttemptActivity), lastPassActivity),
      module_scores: moduleScores,
    };
  });

  return NextResponse.json({ learners });
}
