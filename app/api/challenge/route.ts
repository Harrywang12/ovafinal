import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabase";
import { assertEnv, difficultyToDuration } from "../../../lib/utils";

export const runtime = "nodejs";

type ChallengeQuestion = {
  id: string;
  kind: "challenge";
  difficulty: "easy" | "medium" | "hard";
  video_url: string;
  pause_at_seconds: number;
  options: string[];
  answer_window_seconds?: number | null;
};

function resolveAnswerWindow(question: ChallengeQuestion | null): number | null {
  if (!question) return null;
  if (typeof question.answer_window_seconds === "number" && question.answer_window_seconds > 0) {
    return question.answer_window_seconds;
  }
  return difficultyToDuration(question.difficulty as "easy" | "medium" | "hard" | "extreme");
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
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || "indoor";

  const { data: attempts, error: attemptsError } = await supabase
    .from("video_question_attempts")
    .select("question_id")
    .eq("user_id", user.userId);

  if (attemptsError) {
    return NextResponse.json({ error: attemptsError.message }, { status: 500 });
  }

  const attemptedIds = new Set((attempts || []).map((a) => a.question_id));

  // Try to filter by category. If the column doesn't exist yet, fall back to no filter.
  let weeklyQuery = supabase
    .from("video_questions")
    .select("id, kind, difficulty, video_url, pause_at_seconds, options, answer_window_seconds")
    .eq("kind", "challenge")
    .eq("is_weekly", true)
    .order("created_at", { ascending: false })
    .limit(1);

  // Apply category filter (graceful — column may not exist yet)
  weeklyQuery = weeklyQuery.eq("category", category);

  const { data: weeklyQuestions, error: weeklyError } = await weeklyQuery;

  if (weeklyError) {
    // If category column doesn't exist, fall back to unfiltered query
    const { data: fallbackWeekly, error: fallbackError } = await supabase
      .from("video_questions")
      .select("id, kind, difficulty, video_url, pause_at_seconds, options")
      .eq("kind", "challenge")
      .eq("is_weekly", true)
      .order("created_at", { ascending: false })
      .limit(1);

    if (fallbackError) {
      return NextResponse.json({ error: fallbackError.message }, { status: 500 });
    }

    const weekly = (fallbackWeekly?.[0] as ChallengeQuestion | undefined) ?? null;
    let question: ChallengeQuestion | null = null;
    let alreadyAttempted = false;

    if (weekly) {
      if (attemptedIds.has(weekly.id)) {
        alreadyAttempted = true;
      } else {
        question = weekly;
      }
    }

    const { data: leaderboard } = await supabase
      .from("weekly_leaderboard_mcq")
      .select("*")
      .limit(20);

    const answerWindowSeconds = resolveAnswerWindow(question);

    return NextResponse.json({
      question: question ? { ...question, answer_window_seconds: answerWindowSeconds } : null,
      leaderboard: leaderboard ?? [],
      already_attempted: alreadyAttempted,
    });
  }

  const weekly = (weeklyQuestions?.[0] as ChallengeQuestion | undefined) ?? null;
  let question: ChallengeQuestion | null = null;
  let alreadyAttempted = false;

  if (weekly) {
    if (attemptedIds.has(weekly.id)) {
      alreadyAttempted = true;
    } else {
      question = weekly;
    }
  }

  if (!question && !weekly) {
    let fallbackQuery = supabase
      .from("video_questions")
      .select("id, kind, difficulty, video_url, pause_at_seconds, options, answer_window_seconds")
      .eq("kind", "challenge")
      .limit(50);
    
    // Try to apply category filter to fallback query too
    fallbackQuery = fallbackQuery.eq("category", category);

    const { data: anyChallenge } = await fallbackQuery;
    const available = (anyChallenge || []).filter((q) => !attemptedIds.has(q.id));
    question = available.length
      ? (available[Math.floor(Math.random() * available.length)] as ChallengeQuestion)
      : null;
    if (!question && (anyChallenge || []).length > 0) {
      alreadyAttempted = true;
    }
  }

  const { data: leaderboard, error: lbError } = await supabase
    .from("weekly_leaderboard_mcq")
    .select("*")
    .limit(20);

  if (lbError) {
    return NextResponse.json({ error: lbError.message }, { status: 500 });
  }

  const answerWindowSeconds = resolveAnswerWindow(question);

  return NextResponse.json({
    question: question
      ? {
          ...question,
          answer_window_seconds: answerWindowSeconds,
        }
      : null,
    leaderboard: leaderboard ?? [],
    already_attempted: alreadyAttempted,
  });
}

/**
 * Calculate score based on correctness, response time, and difficulty.
 * Formula: baseScore + timeBonus + difficultyMultiplier
 */
function calculateScore(
  isCorrect: boolean,
  timeTaken: number | undefined,
  difficulty: string,
  maxTime: number
): number {
  if (!isCorrect) {
    return 0;
  }

  // Base score for correct answer
  const baseScore = 100;

  // Time bonus: faster responses get bonus points (max 20 points)
  // Formula: (maxTime - timeTaken) * 2, capped at 20
  const timeBonus = timeTaken !== undefined
    ? Math.max(0, Math.min(20, (maxTime - timeTaken) * 2))
    : 0;

  // Difficulty multiplier
  const difficultyPoints: Record<string, number> = {
    easy: 0,
    medium: 10,
    hard: 20,
    extreme: 30
  };
  const difficultyMultiplier = difficultyPoints[difficulty] || 0;

  return baseScore + timeBonus + difficultyMultiplier;
}

export async function POST(request: Request) {
  assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);
  const user = await requireUserId(request);
  if ("error" in user) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }

  const supabase = getServerSupabase();

  let body: {
    question_id?: string;
    selected_option_index?: number | null;
    time_taken_ms?: number;
    timed_out?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { question_id, selected_option_index, time_taken_ms, timed_out } = body;
  if (!question_id) {
    return NextResponse.json({ error: "question_id required" }, { status: 400 });
  }

  const { data: existing, error: existingError } = await supabase
    .from("video_question_attempts")
    .select("id")
    .eq("user_id", user.userId)
    .eq("question_id", question_id)
    .limit(1);

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: "You have already attempted this challenge." }, { status: 409 });
  }

  const { data: q, error: qError } = await supabase
    .from("video_questions")
    .select("id, difficulty, correct_option_index, explanation, rule_reference, answer_window_seconds")
    .eq("id", question_id)
    .single();

  if (qError || !q) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const didTimeout = !!timed_out;
  const selected = typeof selected_option_index === "number" ? selected_option_index : null;
  const isCorrect = !didTimeout && selected !== null && selected === q.correct_option_index;

  const maxTimeSeconds =
    typeof q.answer_window_seconds === "number" && q.answer_window_seconds > 0
      ? q.answer_window_seconds
      : difficultyToDuration(q.difficulty as "easy" | "medium" | "hard" | "extreme");
  const timeTakenSeconds = typeof time_taken_ms === "number" ? Math.max(0, Math.ceil(time_taken_ms / 1000)) : undefined;
  const calculatedScore = calculateScore(isCorrect, timeTakenSeconds, q.difficulty, maxTimeSeconds);

  // Store attempt (practice-style tracking)
  const { error: attemptError } = await supabase.from("video_question_attempts").insert({
    user_id: user.userId,
    question_id,
    selected_option_index: selected,
    correct: isCorrect,
    timed_out: didTimeout,
    time_taken_ms: typeof time_taken_ms === "number" ? Math.max(0, Math.floor(time_taken_ms)) : null,
  });

  if (attemptError) {
    return NextResponse.json({ error: attemptError.message }, { status: 500 });
  }

  const { error: insertError } = await supabase.from("mcq_challenge_entries").insert({
    user_id: user.userId,
    question_id,
    score: calculatedScore,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    is_correct: isCorrect,
    correct_option_index: q.correct_option_index,
    explanation: q.explanation,
    rule_reference: q.rule_reference,
    score: calculatedScore,
  });
}
