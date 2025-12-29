import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabase";
import { assertEnv, difficultyToDuration } from "../../../lib/utils";

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
  assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);
  const supabase = getServerSupabase();
  const body = await request.json();
  const { video_id, user_id, correct, time_taken } = body;
  if (!video_id) {
    return NextResponse.json({ error: "video_id required" }, { status: 400 });
  }

  const { error } = await supabase.from("video_attempts").insert({
    video_id,
    user_id,
    correct,
    time_taken
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
