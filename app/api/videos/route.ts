import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabase";
import { assertEnv } from "../../../lib/utils";

export const runtime = "nodejs";

/**
 * GET /api/videos
 * List all videos (for admin/debugging purposes)
 */
export async function GET(request: Request) {
  assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);
  const supabase = getServerSupabase();
  const { searchParams } = new URL(request.url);
  const difficulty = searchParams.get("difficulty");

  let query = supabase.from("videos").select("*");
  if (difficulty) {
    query = query.eq("difficulty", difficulty);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ videos: data || [] });
}

/**
 * POST /api/videos
 * Create a new video entry
 * 
 * Body: {
 *   difficulty: "easy" | "medium" | "hard" | "extreme",
 *   video_url: string,
 *   correct_call: string,
 *   explanation?: string,
 *   rule_reference?: string
 * }
 */
export async function POST(request: Request) {
  assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);
  const supabase = getServerSupabase();
  const body = await request.json();

  const { difficulty, video_url, correct_call, explanation, rule_reference } = body;

  // Validation
  if (!difficulty || !video_url || !correct_call) {
    return NextResponse.json(
      { error: "difficulty, video_url, and correct_call are required" },
      { status: 400 }
    );
  }

  const validDifficulties = ["easy", "medium", "hard", "extreme"];
  if (!validDifficulties.includes(difficulty)) {
    return NextResponse.json(
      { error: `difficulty must be one of: ${validDifficulties.join(", ")}` },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("videos")
    .insert({
      difficulty,
      video_url,
      correct_call,
      explanation: explanation || null,
      rule_reference: rule_reference || null
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ video: data }, { status: 201 });
}

