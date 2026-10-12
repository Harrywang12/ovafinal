import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "../../../../lib/admin";
import {
  calculateLatestScore,
  normalizeRefereeLevel,
  questionLevelForRefereeLevel,
} from "../../../../lib/learning";
import { getAllModules } from "../../../../lib/module-content";
import { getServerSupabase } from "../../../../lib/supabase";
import { groupBy, selectAllRows } from "../../../../lib/supabase-pagination";
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
  let profiles: ProfileRow[];
  let lessons: LessonRow[];
  let attempts: AttemptRow[];
  let passes: PassRow[];
  let assignments: AssignmentRow[];
  try {
    [profiles, lessons, attempts, passes, assignments] = await Promise.all([
      selectAllRows<ProfileRow>((from, to) => supabase
        .from("profiles")
        .select("user_id, email, referee_level, created_at")
        .order("created_at", { ascending: false })
        .order("user_id")
        .range(from, to)),
      selectAllRows<LessonRow>((from, to) => supabase
        .from("module_lesson_progress").select("user_id, module_id, lesson_id, viewed_at").order("id").range(from, to)),
      selectAllRows<AttemptRow>((from, to) => supabase
        .from("module_quiz_attempts").select("user_id, module_id, correct, created_at")
        .order("created_at", { ascending: false }).order("id").range(from, to)),
      selectAllRows<PassRow>((from, to) => supabase
        .from("module_passes").select("user_id, module_id, score_percent, passed_at").order("id").range(from, to)),
      selectAllRows<AssignmentRow>((from, to) => supabase
        .from("module_assignments").select("user_id, module_id").order("id").range(from, to)),
    ]);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }

  const allModules = getAllModules();
  const moduleCount = allModules.length;
  const lessonsByUser = groupBy(lessons, (row) => row.user_id);
  const attemptsByUser = groupBy(attempts, (row) => row.user_id);
  const passesByUser = groupBy(passes, (row) => row.user_id);
  const assignmentsByUser = groupBy(assignments, (row) => row.user_id);

  const learners = profiles.map((profile) => {
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
