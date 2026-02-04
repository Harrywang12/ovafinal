import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabase";
import { assertEnv } from "../../../lib/utils";

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

function weekStartUtcIso(date: Date): string {
  // Postgres date_trunc('week', ...) uses Monday as week start.
  const day = date.getUTCDay(); // 0=Sun..6=Sat
  const diffToMonday = (day + 6) % 7;
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - diffToMonday);
  start.setUTCHours(0, 0, 0, 0);
  return start.toISOString();
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

  return NextResponse.json({
    user: {
      id: user.userId,
      email: userEmail,
    },
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
