import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "../../../lib/supabase";
import { assertEnv, difficultyToDuration } from "../../../lib/utils";
import { requireUserFromRequest } from "../../../lib/auth";
import { leaderboardName } from "../../../lib/usernames";

export const runtime = "nodejs";

// Allowance for the round trip between the clip pausing and the answer
// reaching the server.
const ANSWER_GRACE_MS = 2_000;

type ChallengeQuestion = {
  id: string;
  kind: "challenge";
  difficulty: "easy" | "medium" | "hard";
  video_url: string;
  pause_at_seconds: number;
  options: string[];
  answer_window_seconds?: number | null;
};

const startSchema = z.object({ action: z.literal("start"), question_id: z.string().uuid() });
const answerSchema = z.object({
  action: z.literal("answer").optional(),
  question_id: z.string().uuid(),
  selected_option_index: z.number().int().min(0).max(3).nullable().optional(),
  timed_out: z.boolean().optional(),
});

function answerWindowSeconds(question: { answer_window_seconds?: number | null; difficulty: string }) {
  if (typeof question.answer_window_seconds === "number" && question.answer_window_seconds > 0) {
    return question.answer_window_seconds;
  }
  return difficultyToDuration(question.difficulty as "easy" | "medium" | "hard" | "extreme");
}

export async function GET(request: Request) {
  assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);
  const user = await requireUserFromRequest(request);
  if (!user.ok) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }

  const supabase = getServerSupabase();
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") === "beach" ? "beach" : "indoor";

  const { data: attempts, error: attemptsError } = await supabase
    .from("video_question_attempts")
    .select("question_id")
    .eq("user_id", user.userId);

  if (attemptsError) {
    return NextResponse.json({ error: attemptsError.message }, { status: 500 });
  }

  const attemptedIds = new Set((attempts || []).map((a) => a.question_id));
  const columns = "id, kind, difficulty, video_url, pause_at_seconds, options, answer_window_seconds";

  const { data: weeklyQuestions, error: weeklyError } = await supabase
    .from("video_questions")
    .select(columns)
    .eq("kind", "challenge")
    .eq("is_weekly", true)
    .eq("category", category)
    .order("created_at", { ascending: false })
    .limit(1);

  if (weeklyError) {
    return NextResponse.json({ error: weeklyError.message }, { status: 500 });
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
  } else {
    const { data: anyChallenge, error: fallbackError } = await supabase
      .from("video_questions")
      .select(columns)
      .eq("kind", "challenge")
      .eq("category", category)
      .limit(50);

    if (fallbackError) {
      return NextResponse.json({ error: fallbackError.message }, { status: 500 });
    }

    const available = (anyChallenge || []).filter((q) => !attemptedIds.has(q.id));
    question = available.length
      ? (available[Math.floor(Math.random() * available.length)] as ChallengeQuestion)
      : null;
    if (!question && (anyChallenge || []).length > 0) {
      alreadyAttempted = true;
    }
  }

  const { data: ranked, error: lbError } = await supabase
    .from("weekly_leaderboard_mcq")
    .select("user_id, best_score")
    .limit(20);

  if (lbError) {
    return NextResponse.json({ error: lbError.message }, { status: 500 });
  }

  // Resolve display names server-side so user ids never reach the browser.
  const rankedUserIds = (ranked || []).map((row) => row.user_id as string);
  const { data: rankedProfiles, error: profileError } = rankedUserIds.length
    ? await supabase.from("profiles").select("user_id, username").in("user_id", rankedUserIds)
    : { data: [], error: null };

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const usernameByUser = new Map((rankedProfiles || []).map((profile) => [profile.user_id, profile.username as string | null]));
  const leaderboard = (ranked || []).map((row) => ({
    username: leaderboardName(usernameByUser.get(row.user_id), row.user_id),
    best_score: row.best_score,
    is_current_user: row.user_id === user.userId,
  }));

  return NextResponse.json({
    question: question ? { ...question, answer_window_seconds: answerWindowSeconds(question) } : null,
    leaderboard,
    already_attempted: alreadyAttempted,
  });
}

/**
 * Calculate score based on correctness, response time, and difficulty.
 * Formula: baseScore + timeBonus + difficultyMultiplier
 */
function calculateScore(
  isCorrect: boolean,
  timeTaken: number,
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
  const timeBonus = Math.max(0, Math.min(20, (maxTime - timeTaken) * 2));

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

/**
 * POST { action: "start", question_id } when the clip pauses: records the
 * server-side start of the answer window.
 * POST { question_id, selected_option_index } to answer: elapsed time and
 * timeout are measured from the recorded start, never from the client.
 */
export async function POST(request: Request) {
  assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);
  const user = await requireUserFromRequest(request);
  if (!user.ok) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }

  const body = await request.json().catch(() => null);
  const start = startSchema.safeParse(body);
  const answer = start.success ? null : answerSchema.safeParse(body);
  if (!start.success && !answer?.success) {
    return NextResponse.json({ error: "question_id required" }, { status: 400 });
  }
  const questionId = start.success ? start.data.question_id : answer!.data!.question_id;

  const supabase = getServerSupabase();
  const { data: existing, error: existingError } = await supabase
    .from("video_question_attempts")
    .select("id")
    .eq("user_id", user.userId)
    .eq("question_id", questionId)
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
    .eq("id", questionId)
    .eq("kind", "challenge")
    .maybeSingle();

  if (qError || !q) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const maxTimeSeconds = answerWindowSeconds(q);

  if (start.success) {
    // A repeated start keeps the original time so reloading cannot reset the clock.
    const { error: startError } = await supabase
      .from("video_challenge_starts")
      .upsert({ user_id: user.userId, question_id: questionId }, { onConflict: "user_id,question_id", ignoreDuplicates: true });
    if (startError) {
      return NextResponse.json({ error: startError.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, answer_window_seconds: maxTimeSeconds });
  }

  const { data: started, error: startedError } = await supabase
    .from("video_challenge_starts")
    .select("started_at")
    .eq("user_id", user.userId)
    .eq("question_id", questionId)
    .maybeSingle();

  if (startedError) {
    return NextResponse.json({ error: startedError.message }, { status: 500 });
  }
  if (!started) {
    return NextResponse.json({ error: "Watch the clip to the pause point before answering." }, { status: 409 });
  }

  const elapsedMs = Math.max(0, Date.now() - Date.parse(started.started_at));
  const didTimeout = answer!.data!.timed_out === true || elapsedMs > maxTimeSeconds * 1000 + ANSWER_GRACE_MS;
  const selected = didTimeout ? null : answer!.data!.selected_option_index ?? null;
  const isCorrect = selected !== null && selected === q.correct_option_index;
  const timeTakenMs = Math.min(elapsedMs, maxTimeSeconds * 1000);
  const calculatedScore = calculateScore(isCorrect, Math.ceil(timeTakenMs / 1000), q.difficulty, maxTimeSeconds);

  const { data: attempt, error: attemptError } = await supabase.from("video_question_attempts").insert({
    user_id: user.userId,
    question_id: questionId,
    selected_option_index: selected,
    correct: isCorrect,
    timed_out: didTimeout,
    time_taken_ms: timeTakenMs,
  }).select("id").single();

  if (attemptError?.code === "23505") {
    return NextResponse.json({ error: "You have already attempted this challenge." }, { status: 409 });
  }
  if (attemptError) {
    return NextResponse.json({ error: attemptError.message }, { status: 500 });
  }

  const { error: insertError } = await supabase.from("mcq_challenge_entries").insert({
    user_id: user.userId,
    question_id: questionId,
    score: calculatedScore,
  });

  if (insertError) {
    // Undo the attempt so a failed leaderboard write does not lock the learner out.
    await supabase.from("video_question_attempts").delete().eq("id", attempt.id);
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
