import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabase";
import { assertEnv, difficultyToDuration } from "../../../lib/utils";
import { evaluateVideoRuling } from "../../../lib/video-evaluation";

export const runtime = "nodejs";

export async function GET() {
  assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);
  const supabase = getServerSupabase();
  const { data: videos, error: videoError } = await supabase
    .from("videos")
    .select("*")
    .eq("difficulty", "extreme")
    .limit(1);

  if (videoError) {
    return NextResponse.json({ error: videoError.message }, { status: 500 });
  }

  const video = videos?.[0];
  const { data: leaderboard, error: lbError } = await supabase
    .from("weekly_leaderboard")
    .select("*")
    .limit(20);

  if (lbError) {
    return NextResponse.json({ error: lbError.message }, { status: 500 });
  }

  return NextResponse.json({ video, leaderboard: leaderboard ?? [] });
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
  assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY", "OPENAI_API_KEY"]);
  const supabase = getServerSupabase();
  const { user_id, video_id, userAnswer, time_taken } = await request.json();
  
  if (!video_id) {
    return NextResponse.json({ error: "video_id required" }, { status: 400 });
  }
  
  if (!userAnswer || typeof userAnswer !== "string" || !userAnswer.trim()) {
    return NextResponse.json({ error: "userAnswer (string) is required" }, { status: 400 });
  }

  // Retrieve video metadata to get correct_call and difficulty
  const { data: video, error: videoError } = await supabase
    .from("videos")
    .select("correct_call, difficulty")
    .eq("id", video_id)
    .single();

  if (videoError || !video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  // Evaluate the user's ruling using AI
  let evaluation;
  try {
    evaluation = await evaluateVideoRuling(
      userAnswer.trim(),
      video.correct_call,
      video.difficulty
    );
  } catch (error) {
    console.error("Error evaluating video ruling:", error);
    return NextResponse.json(
      { error: "Failed to evaluate ruling. Please try again." },
      { status: 500 }
    );
  }

  // Calculate score server-side
  const maxTime = difficultyToDuration(video.difficulty);
  const calculatedScore = calculateScore(
    evaluation.is_correct,
    time_taken,
    video.difficulty,
    maxTime
  );

  // Store the challenge entry with calculated score
  const { error: insertError } = await supabase.from("challenge_entries").insert({
    user_id,
    video_id,
    score: calculatedScore
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Return evaluation result with calculated score
  return NextResponse.json({
    ok: true,
    is_correct: evaluation.is_correct,
    normalized_call: evaluation.normalized_call,
    explanation: evaluation.explanation,
    rule_reference: evaluation.rule_reference,
    score: calculatedScore
  });
}
