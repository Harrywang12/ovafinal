import { NextResponse } from "next/server";
import { requireUserFromRequest, requestUserQuestionLevel } from "../../../../lib/auth";
import { calculateLatestScore } from "../../../../lib/learning";
import { getModuleBySlug } from "../../../../lib/module-content";
import { recordQuizQuestionHistory } from "../../../../lib/quiz-question-history";
import { getServerSupabase } from "../../../../lib/supabase";
import { assertEnv } from "../../../../lib/utils";

export const runtime = "nodejs";

type AttemptPayload = {
  module_id?: string;
  question?: unknown;
  selected_option?: string;
  correct?: boolean;
};

type AttemptRow = {
  correct: boolean;
  created_at: string;
};

export async function POST(request: Request) {
  assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);
  const user = await requireUserFromRequest(request);
  if (!user.ok) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }

  let body: AttemptPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const moduleData = body.module_id ? getModuleBySlug(body.module_id) : undefined;
  if (!moduleData || !body.question || typeof body.selected_option !== "string" || typeof body.correct !== "boolean") {
    return NextResponse.json(
      { error: "module_id, question, selected_option, and correct are required" },
      { status: 400 }
    );
  }

  const supabase = getServerSupabase();
  const questionLevel = requestUserQuestionLevel(user);
  const { error: insertError } = await supabase.from("module_quiz_attempts").insert({
    user_id: user.userId,
    module_id: moduleData.id,
    question_level: questionLevel,
    question: body.question,
    selected_option: body.selected_option,
    correct: body.correct,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { data: attempts, error: attemptError } = await supabase
    .from("module_quiz_attempts")
    .select("correct, created_at")
    .eq("user_id", user.userId)
    .eq("module_id", moduleData.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (attemptError) {
    return NextResponse.json({ error: attemptError.message }, { status: 500 });
  }

  const score = calculateLatestScore((attempts || []) as AttemptRow[]);
  let passed = false;
  let passedAt: string | null = null;

  if (score.meetsPassRequirement) {
    passed = true;
    const now = new Date().toISOString();
    const { data: pass, error: passError } = await supabase
      .from("module_passes")
      .upsert(
        {
          user_id: user.userId,
          module_id: moduleData.id,
          latest_attempts_count: score.latestAttemptsCount,
          correct_count: score.latestCorrectCount,
          score_percent: score.latestScorePercent,
          passed_at: now,
        },
        { onConflict: "user_id,module_id", ignoreDuplicates: true }
      )
      .select("passed_at")
      .maybeSingle();

    if (passError) {
      return NextResponse.json({ error: passError.message }, { status: 500 });
    }

    passedAt = pass?.passed_at ?? now;
  } else {
    const { data: existingPass, error: passReadError } = await supabase
      .from("module_passes")
      .select("passed_at")
      .eq("user_id", user.userId)
      .eq("module_id", moduleData.id)
      .maybeSingle();

    if (passReadError) {
      return NextResponse.json({ error: passReadError.message }, { status: 500 });
    }
    passed = !!existingPass;
    passedAt = existingPass?.passed_at ?? null;
  }

  await recordQuizQuestionHistory({
    supabase,
    userId: user.userId,
    scope: "module",
    moduleId: moduleData.id,
    questionLevel,
    question: body.question,
  });

  return NextResponse.json({
    ok: true,
    module_id: moduleData.id,
    latest_attempts_count: score.latestAttemptsCount,
    latest_correct_count: score.latestCorrectCount,
    latest_score_percent: score.latestScorePercent,
    passed,
    passed_at: passedAt,
  });
}
