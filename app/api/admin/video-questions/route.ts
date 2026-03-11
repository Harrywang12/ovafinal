import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../../lib/supabase";
import { assertEnv } from "../../../../lib/utils";
import { requireAdminFromRequest } from "../../../../lib/admin";

export const runtime = "nodejs";

type CreatePayload = {
  kind: "practice" | "challenge";
  difficulty: "easy" | "medium" | "hard";
  video_url: string;
  pause_at_seconds: number;
  options: [string, string, string, string];
  correct_option_index: 0 | 1 | 2 | 3;
  explanation?: string;
  rule_reference?: string;
  is_weekly?: boolean;
  category?: "indoor" | "beach";
};

export async function GET(request: Request) {
  assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);

  const admin = await requireAdminFromRequest(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const supabase = getServerSupabase();
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind");

  let query = supabase.from("video_questions").select("*");
  if (kind && (kind === "practice" || kind === "challenge")) {
    query = query.eq("kind", kind);
  }

  const { data, error } = await query.order("created_at", { ascending: false }).limit(200);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ questions: data ?? [] });
}

export async function POST(request: Request) {
  assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);

  const admin = await requireAdminFromRequest(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  let body: CreatePayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    kind,
    difficulty,
    video_url,
    pause_at_seconds,
    options,
    correct_option_index,
    explanation,
    rule_reference,
    is_weekly,
    category,
  } = body;

  if (!kind || !difficulty || !video_url || !pause_at_seconds || !options) {
    return NextResponse.json(
      { error: "kind, difficulty, video_url, pause_at_seconds, options are required" },
      { status: 400 }
    );
  }

  if (!Array.isArray(options) || options.length !== 4 || options.some((o) => typeof o !== "string" || !o.trim())) {
    return NextResponse.json({ error: "options must be an array of 4 non-empty strings" }, { status: 400 });
  }

  if (![0, 1, 2, 3].includes(correct_option_index)) {
    return NextResponse.json({ error: "correct_option_index must be 0..3" }, { status: 400 });
  }

  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("video_questions")
    .insert({
      kind,
      difficulty,
      video_url,
      pause_at_seconds: Math.floor(pause_at_seconds),
      options,
      correct_option_index,
      explanation: explanation || null,
      rule_reference: rule_reference || null,
      is_weekly: !!is_weekly,
      category: category || "indoor",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ question: data }, { status: 201 });
}
