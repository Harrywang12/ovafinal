import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabase";
import { assertEnv } from "../../../lib/utils";
import { getAllModules } from "../../../lib/module-content";
import { calculateLatestScore, normalizeRefereeLevel, questionLevelForRefereeLevel } from "../../../lib/learning";
import { getQuizAssignmentProgress } from "../../../lib/quiz-assignments";

export const runtime = "nodejs";

type Difficulty = "easy" | "medium" | "hard";

type AttemptRow = {
  id: string;
  question_id: string;
  correct: boolean | null;
  timed_out: boolean | null;
  time_taken_ms: number | null;
  created_at: string;
  question?: {
    kind?: "practice" | "challenge" | null;
    difficulty?: Difficulty | null;
    is_weekly?: boolean | null;
  } | null;
};

type ChallengeEntryRow = {
  question_id: string;
  score: number | null;
  created_at: string;
};

type LearningLessonRow = {
  module_id: string;
  lesson_id: string;
  viewed_at: string | null;
};

type LearningAttemptRow = {
  module_id: string;
  correct: boolean;
  created_at: string | null;
};

type LearningPassRow = {
  module_id: string;
  correct_count: number;
  score_percent: number;
  passed_at: string | null;
};

type LearningAssignmentRow = {
  module_id: string;
};

function weekStartUtcIso(date: Date): string {
  // Postgres date_trunc('week', ...) uses Monday as week start.
  const day = date.getUTCDay(); // 0=Sun..6=Sat
  const diffToMonday = (day + 6) % 7;
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - diffToMonday);
  start.setUTCHours(0, 0, 0, 0);
  return start.toISOString();
}

function later(a: string | null, b: string | null) {
  if (!a) return b;
  if (!b) return a;
  return Date.parse(a) >= Date.parse(b) ? a : b;
}

async function requireUserId(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return { error: "Unauthorized", status: 401 } as const;
  }

  const supabase = getServerSupabase();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return { error: "Unauthorized", status: 401 } as const;
  }

  return { userId: data.user.id } as const;
}

export async function GET(request: Request) {
  assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);
  const user = await requireUserId(request);
  if ("error" in user) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }

  const supabase = getServerSupabase();
  const { data: authData, error: authError } = await supabase.auth.admin.getUserById(user.userId);
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("video_question_attempts")
    .select("id, question_id, correct, timed_out, time_taken_ms, created_at, question:video_questions(kind, difficulty, is_weekly)")
    .eq("user_id", user.userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const attempts = (data || []) as AttemptRow[];

  const practiceByDifficulty: Record<Difficulty, { attempted: number; solved: number }> = {
    easy: { attempted: 0, solved: 0 },
    medium: { attempted: 0, solved: 0 },
    hard: { attempted: 0, solved: 0 },
  };

  let practiceAttempted = 0;
  let practiceSolved = 0;
  let challengeAttempted = 0;
  let challengeSolved = 0;

  const practiceAttempts: AttemptRow[] = [];
  const challengeAttempts: AttemptRow[] = [];

  for (const row of attempts) {
    const kind = row.question?.kind || null;
    if (kind === "practice") {
      practiceAttempted += 1;
      if (row.correct) practiceSolved += 1;
      practiceAttempts.push(row);

      const diff = row.question?.difficulty ?? null;
      if (diff && (diff === "easy" || diff === "medium" || diff === "hard")) {
        practiceByDifficulty[diff].attempted += 1;
        if (row.correct) practiceByDifficulty[diff].solved += 1;
      }
    } else if (kind === "challenge") {
      challengeAttempted += 1;
      if (row.correct) challengeSolved += 1;
      challengeAttempts.push(row);
    }
  }

  // Fetch challenge scores (if any). This table only tracks challenge entries.
  const challengeQuestionIds = Array.from(
    new Set(challengeAttempts.map((a) => a.question_id).filter(Boolean))
  );
  const scoreByQuestionId = new Map<string, { bestScore: number; lastEntryAt: string }>();
  if (challengeQuestionIds.length > 0) {
    const { data: entries, error: entriesError } = await supabase
      .from("mcq_challenge_entries")
      .select("question_id, score, created_at")
      .eq("user_id", user.userId)
      .in("question_id", challengeQuestionIds);

    if (entriesError) {
      return NextResponse.json({ error: entriesError.message }, { status: 500 });
    }

    for (const row of (entries || []) as ChallengeEntryRow[]) {
      const qid = row.question_id;
      const score = typeof row.score === "number" ? row.score : 0;
      const prev = scoreByQuestionId.get(qid);
      if (!prev || score > prev.bestScore) {
        scoreByQuestionId.set(qid, { bestScore: score, lastEntryAt: row.created_at });
      }
    }
  }

  const now = new Date();
  const currentWeekStartIso = weekStartUtcIso(now);
  const currentWeekStartMs = Date.parse(currentWeekStartIso);

  const weeklyHistoryMap = new Map<
    string,
    { attempted: number; solved: number; best_score: number | null; last_attempt_at: string | null }
  >();

  let thisWeekAttempted = 0;
  let thisWeekSolved = 0;
  let thisWeekBestScore: number | null = null;

  for (const row of challengeAttempts) {
    const isWeekly = row.question?.is_weekly === true;
    if (!isWeekly) continue;
    const attemptAtMs = Date.parse(row.created_at);
    const weekKey = weekStartUtcIso(new Date(row.created_at));

    const existing = weeklyHistoryMap.get(weekKey) || {
      attempted: 0,
      solved: 0,
      best_score: null,
      last_attempt_at: null,
    };
    existing.attempted += 1;
    if (row.correct) existing.solved += 1;
    if (!existing.last_attempt_at || row.created_at > existing.last_attempt_at) {
      existing.last_attempt_at = row.created_at;
    }

    const entry = scoreByQuestionId.get(row.question_id);
    if (entry) {
      existing.best_score =
        existing.best_score === null ? entry.bestScore : Math.max(existing.best_score, entry.bestScore);
    }

    weeklyHistoryMap.set(weekKey, existing);

    if (attemptAtMs >= currentWeekStartMs) {
      thisWeekAttempted += 1;
      if (row.correct) thisWeekSolved += 1;
      if (entry) {
        thisWeekBestScore = thisWeekBestScore === null ? entry.bestScore : Math.max(thisWeekBestScore, entry.bestScore);
      }
    }
  }

  const weeklyHistory = Array.from(weeklyHistoryMap.entries())
    .map(([week_start, v]) => ({ week_start, ...v }))
    .sort((a, b) => (a.week_start > b.week_start ? -1 : 1));

  const recentPractice = practiceAttempts.slice(0, 12).map((a) => ({
    id: a.id,
    question_id: a.question_id,
    created_at: a.created_at,
    correct: a.correct,
    timed_out: a.timed_out,
    time_taken_ms: a.time_taken_ms,
    difficulty: a.question?.difficulty ?? null,
  }));

  const recentChallenge = challengeAttempts.slice(0, 12).map((a) => {
    const entry = scoreByQuestionId.get(a.question_id);
    return {
      id: a.id,
      question_id: a.question_id,
      created_at: a.created_at,
      correct: a.correct,
      timed_out: a.timed_out,
      time_taken_ms: a.time_taken_ms,
      difficulty: a.question?.difficulty ?? null,
      is_weekly: a.question?.is_weekly ?? null,
      score: entry ? entry.bestScore : null,
    };
  });

  const userEmail = authData?.user?.email ?? null;

  const [{ data: profile }, { data: learningLessons, error: learningLessonError }, { data: learningAttempts, error: learningAttemptError }, { data: learningPasses, error: learningPassError }, { data: learningAssignments, error: learningAssignmentError }] =
    await Promise.all([
      supabase.from("profiles").select("referee_level").eq("user_id", user.userId).maybeSingle(),
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

  const learningError = learningLessonError || learningAttemptError || learningPassError || learningAssignmentError;
  if (learningError) {
    return NextResponse.json({ error: learningError.message }, { status: 500 });
  }

  const moduleCatalog = getAllModules();
  const learningLessonsByModule = new Map<string, LearningLessonRow[]>();
  for (const row of (learningLessons || []) as LearningLessonRow[]) {
    learningLessonsByModule.set(row.module_id, [...(learningLessonsByModule.get(row.module_id) || []), row]);
  }
  const learningAttemptsByModule = new Map<string, LearningAttemptRow[]>();
  for (const row of (learningAttempts || []) as LearningAttemptRow[]) {
    learningAttemptsByModule.set(row.module_id, [...(learningAttemptsByModule.get(row.module_id) || []), row]);
  }
  const learningPassByModule = new Map((learningPasses || []).map((row) => [(row as LearningPassRow).module_id, row as LearningPassRow]));
  const assignedModuleIds = new Set(((learningAssignments || []) as LearningAssignmentRow[]).map((row) => row.module_id));

  const learningModules = moduleCatalog.map((module) => {
    const lessonsForModule = learningLessonsByModule.get(module.id) || [];
    const attemptsForModule = learningAttemptsByModule.get(module.id) || [];
    const pass = learningPassByModule.get(module.id) || null;
    const score = calculateLatestScore(attemptsForModule);
    const lastLesson = lessonsForModule.reduce<string | null>((acc, row) => later(acc, row.viewed_at), null);
    const lastAttempt = attemptsForModule.reduce<string | null>((acc, row) => later(acc, row.created_at), null);
    return {
      module_id: module.id,
      title: module.title,
      lessons_viewed: lessonsForModule.length,
      lesson_count: module.lessons.length,
      attempts: attemptsForModule.length,
      latest_score_percent: pass?.score_percent ?? score.latestScorePercent,
      latest_correct_count: pass?.correct_count ?? score.latestCorrectCount,
      latest_attempts_count: score.latestAttemptsCount,
      assigned: assignedModuleIds.has(module.id),
      passed: !!pass,
      passed_at: pass?.passed_at ?? null,
      last_activity_at: later(lastLesson, lastAttempt),
    };
  }).sort((a, b) => Number(b.assigned) - Number(a.assigned));

  const modulesStarted = learningModules.filter((m) => m.lessons_viewed > 0 || m.attempts > 0).length;
  const modulesPassed = learningModules.filter((m) => m.passed).length;
  const assignedModules = learningModules.filter((m) => m.assigned);
  const assignedPassed = assignedModules.filter((m) => m.passed).length;
  const lastLearningActivity = learningModules.reduce<string | null>((acc, row) => later(acc, row.last_activity_at), null);
  const refereeLevel = normalizeRefereeLevel((profile as { referee_level?: string } | null)?.referee_level);
  const quizAssignment = await getQuizAssignmentProgress(supabase, user.userId);

  return NextResponse.json({
    user: {
      id: user.userId,
      email: userEmail,
      referee_level: refereeLevel,
      question_level: questionLevelForRefereeLevel(refereeLevel),
    },
    learning: {
      modules_started: modulesStarted,
      modules_passed: modulesPassed,
      total_modules: moduleCatalog.length,
      required_modules: assignedModules.length,
      required_modules_passed: assignedPassed,
      last_activity_at: lastLearningActivity,
      modules: learningModules,
    },
    quiz_assignment: quizAssignment,
    video_practice: {
      attempted: practiceAttempted,
      solved: practiceSolved,
      by_difficulty: practiceByDifficulty,
    },
    video_challenge: {
      attempted: challengeAttempted,
      solved: challengeSolved,
      this_week: {
        week_start: currentWeekStartIso,
        attempted: thisWeekAttempted,
        solved: thisWeekSolved,
        best_score: thisWeekBestScore,
      },
      weekly_history: weeklyHistory,
    },
    recent: {
      practice: recentPractice,
      challenge: recentChallenge,
    },
  });
}
