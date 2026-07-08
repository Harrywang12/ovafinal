import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabase";
import { assertEnv, difficultyToDuration } from "../../../lib/utils";

export const runtime = "nodejs";

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
  const difficulty = (searchParams.get("difficulty") as "easy" | "medium" | "hard") || "medium";
  const category = searchParams.get("category") || "indoor";

  const { data, error } = await supabase
    .from("video_questions")
    .select("id, kind, difficulty, video_url, pause_at_seconds, options, answer_window_seconds")
    .eq("kind", "practice")
    .eq("difficulty", difficulty)
    .eq("category", category)
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "No practice videos available" }, { status: 404 });
  }

  const { data: attempts, error: attemptsError } = await supabase
    .from("video_question_attempts")
    .select("question_id")
    .eq("user_id", user.userId);

  if (attemptsError) {
    return NextResponse.json({ error: attemptsError.message }, { status: 500 });
  }

  const attemptedIds = new Set((attempts || []).map((a) => a.question_id));
  const available = data.filter((q) => !attemptedIds.has(q.id));
  if (available.length === 0) {
    return NextResponse.json({ error: "No practice videos available" }, { status: 404 });
  }

  const q = available[Math.floor(Math.random() * available.length)];
  const answerWindow =
    typeof q.answer_window_seconds === "number" && q.answer_window_seconds > 0
      ? q.answer_window_seconds
      : difficultyToDuration(q.difficulty as "easy" | "medium" | "hard" | "extreme");

  return NextResponse.json({
    question_id: q.id,
    video_url: q.video_url,
    pause_at_seconds: q.pause_at_seconds,
    options: q.options,
    difficulty: q.difficulty,
    answer_window_seconds: answerWindow,
  });
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
    return NextResponse.json({ error: "You have already attempted this clip." }, { status: 409 });
  }

  const { data: q, error: qError } = await supabase
    .from("video_questions")
    .select("id, correct_option_index, explanation, rule_reference")
    .eq("id", question_id)
    .single();

  if (qError || !q) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const didTimeout = !!timed_out;
  const selected = typeof selected_option_index === "number" ? selected_option_index : null;
  const isCorrect = !didTimeout && selected !== null && selected === q.correct_option_index;

  const { error: insertError } = await supabase.from("video_question_attempts").insert({
    question_id,
    user_id: user.userId,
    selected_option_index: selected,
    correct: isCorrect,
    timed_out: didTimeout,
    time_taken_ms: typeof time_taken_ms === "number" ? Math.max(0, Math.floor(time_taken_ms)) : null,
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
  });
}
