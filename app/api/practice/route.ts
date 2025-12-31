import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabase";
import { assertEnv, difficultyToDuration } from "../../../lib/utils";
import { evaluateVideoRuling } from "../../../lib/video-evaluation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);
  const supabase = getServerSupabase();
  const { searchParams } = new URL(request.url);
  const difficulty = (searchParams.get("difficulty") as "easy" | "medium" | "hard" | "extreme") || "medium";
  const isWeekly = searchParams.get("weekly") === "true";

  const targetDifficulty = isWeekly ? "extreme" : difficulty;
  const { data, error } = await supabase
    .from("videos")
    .select("*")
    .eq("difficulty", targetDifficulty)
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "No videos available" }, { status: 404 });
  }

  const video = data[Math.floor(Math.random() * data.length)];
  const duration = difficultyToDuration(targetDifficulty);

  return NextResponse.json({
    video_id: video.id,
    video_url: video.video_url,
    correct_call: video.correct_call,
    explanation: video.explanation,
    rule_reference: video.rule_reference,
    duration_seconds: duration
  });
}

export async function POST(request: Request) {
  assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY", "OPENAI_API_KEY"]);
  const supabase = getServerSupabase();
  const body = await request.json();
  const { video_id, user_id, userAnswer, time_taken } = body;
  
  if (!video_id) {
    return NextResponse.json({ error: "video_id required" }, { status: 400 });
  }
  
  if (!userAnswer || typeof userAnswer !== "string" || !userAnswer.trim()) {
    return NextResponse.json({ error: "userAnswer (string) required" }, { status: 400 });
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

  // Store the attempt with the evaluated correctness
  const { error: insertError } = await supabase.from("video_attempts").insert({
    video_id,
    user_id,
    correct: evaluation.is_correct,
    time_taken
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Return the evaluation result with AI-generated explanation
  return NextResponse.json({
    ok: true,
    is_correct: evaluation.is_correct,
    normalized_call: evaluation.normalized_call,
    explanation: evaluation.explanation,
    rule_reference: evaluation.rule_reference
  });
}
