import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabase";
import { assertEnv } from "../../../lib/utils";

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

export async function POST(request: Request) {
  assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);
  const supabase = getServerSupabase();
  const { user_id, video_id, score } = await request.json();
  if (!video_id) {
    return NextResponse.json({ error: "video_id required" }, { status: 400 });
  }
  const { error } = await supabase.from("challenge_entries").insert({
    user_id,
    video_id,
    score
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
