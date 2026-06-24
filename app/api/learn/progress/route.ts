import { NextResponse } from "next/server";
import { requireUserFromRequest, requestUserQuestionLevel } from "../../../../lib/auth";
import { getServerSupabase } from "../../../../lib/supabase";
import { assertEnv } from "../../../../lib/utils";
import { getAllModules } from "../../../../lib/module-content";
import {
  MODULE_PASS_CORRECT_REQUIREMENT,
  MODULE_PASS_PERCENT,
  MODULE_PASS_QUESTION_REQUIREMENT,
  calculateLatestScore,
  type LearningProgressResponse,
} from "../../../../lib/learning";

export const runtime = "nodejs";

type LessonRow = {
  module_id: string;
  lesson_id: string;
  viewed_at: string | null;
};

type AttemptRow = {
  module_id: string;
  correct: boolean;
  created_at: string | null;
};

type PassRow = {
  module_id: string;
  correct_count: number;
  score_percent: number;
  passed_at: string | null;
};

type AssignmentRow = {
  module_id: string;
};

function later(a: string | null, b: string | null) {
  if (!a) return b;
  if (!b) return a;
  return Date.parse(a) >= Date.parse(b) ? a : b;
}

export async function GET(request: Request) {
  assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);
  const user = await requireUserFromRequest(request);
  if (!user.ok) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }

  const supabase = getServerSupabase();
  const [{ data: lessons, error: lessonError }, { data: attempts, error: attemptError }, { data: passes, error: passError }, { data: assignments, error: assignmentError }] =
    await Promise.all([
      supabase
        .from("module_lesson_progress")
        .select("module_id, lesson_id, viewed_at")
        .eq("user_id", user.userId),
      supabase
        .from("module_quiz_attempts")
        .select("module_id, correct, created_at")
        .eq("user_id", user.userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("module_passes")
        .select("module_id, correct_count, score_percent, passed_at")
        .eq("user_id", user.userId),
      supabase
        .from("module_assignments")
        .select("module_id")
        .eq("user_id", user.userId),
    ]);

  const error = lessonError || attemptError || passError || assignmentError;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const lessonsByModule = new Map<string, LessonRow[]>();
  for (const row of (lessons || []) as LessonRow[]) {
    const list = lessonsByModule.get(row.module_id) || [];
    list.push(row);
    lessonsByModule.set(row.module_id, list);
  }

  const attemptsByModule = new Map<string, AttemptRow[]>();
  for (const row of (attempts || []) as AttemptRow[]) {
    const list = attemptsByModule.get(row.module_id) || [];
    list.push(row);
    attemptsByModule.set(row.module_id, list);
  }

  const passByModule = new Map((passes || []).map((row) => [(row as PassRow).module_id, row as PassRow]));
  const assignedModuleIds = new Set(((assignments || []) as AssignmentRow[]).map((row) => row.module_id));

  const modules = getAllModules().map((module) => {
    const moduleLessons = lessonsByModule.get(module.id) || [];
    const moduleAttempts = attemptsByModule.get(module.id) || [];
    const pass = passByModule.get(module.id) || null;
    const latest = calculateLatestScore(moduleAttempts);
    const lessonActivity = moduleLessons.reduce<string | null>((acc, row) => later(acc, row.viewed_at), null);
    const attemptActivity = moduleAttempts.reduce<string | null>((acc, row) => later(acc, row.created_at), null);
    const lastActivity = later(lessonActivity, attemptActivity);
    const passed = !!pass;
    const started = moduleLessons.length > 0 || moduleAttempts.length > 0;

    return {
      module_id: module.id,
      title: module.title,
      lesson_count: module.lessons.length,
      lessons_viewed: moduleLessons.length,
      attempts: moduleAttempts.length,
      latest_attempts_count: latest.latestAttemptsCount,
      latest_correct_count: pass?.correct_count ?? latest.latestCorrectCount,
      latest_score_percent: pass?.score_percent ?? latest.latestScorePercent,
      passed,
      assigned: assignedModuleIds.has(module.id),
      passed_at: pass?.passed_at ?? null,
      status: passed ? "passed" : started ? "in_progress" : "not_started",
      last_activity_at: lastActivity,
    } satisfies LearningProgressResponse["modules"][number];
  }).sort((a, b) => Number(b.assigned) - Number(a.assigned));

  return NextResponse.json({
    profile: {
      user_id: user.userId,
      email: user.email,
      referee_level: user.refereeLevel,
      question_level: requestUserQuestionLevel(user),
    },
    requirements: {
      question_count: MODULE_PASS_QUESTION_REQUIREMENT,
      correct_count: MODULE_PASS_CORRECT_REQUIREMENT,
      percent: MODULE_PASS_PERCENT,
    },
    modules,
  } satisfies LearningProgressResponse);
}
