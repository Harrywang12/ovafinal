import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserFromRequest, requestUserQuestionLevel } from "../../../../lib/auth";
import { generatedQuizQuestionSchema } from "../../../../lib/generated-quiz-question";
import { calculateLatestScore } from "../../../../lib/learning";
import { getModuleBySlug } from "../../../../lib/module-content";
import { getServerSupabase } from "../../../../lib/supabase";
import { assertEnv } from "../../../../lib/utils";

export const runtime = "nodejs";

const attemptSchema = z.object({
  module_id: z.string().trim().min(1),
  question_id: z.string().uuid(),
  selected_option: z.string().min(1),
});

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

  const body = attemptSchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message || "Invalid attempt" }, { status: 400 });
  const moduleData = getModuleBySlug(body.data.module_id);
  if (!moduleData) return NextResponse.json({ error: "Valid module_id required" }, { status: 400 });

  const supabase = getServerSupabase();
  const questionLevel = requestUserQuestionLevel(user);
  const { data: stored, error: lookupError } = await supabase.from("generated_quiz_questions")
    .select("id, question_data, answered_at")
    .eq("id", body.data.question_id)
    .eq("user_id", user.userId)
    .eq("scope", "module")
    .eq("module_id", moduleData.id)
    .maybeSingle();
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });
  if (!stored) return NextResponse.json({ error: "Question not found" }, { status: 404 });
  if (stored.answered_at) return NextResponse.json({ error: "Question has already been answered" }, { status: 409 });
  const question = generatedQuizQuestionSchema.parse(stored.question_data);
  if (!question.options.includes(body.data.selected_option)) return NextResponse.json({ error: "Selected answer is not a valid option" }, { status: 400 });
  const correct = body.data.selected_option === question.answer;
  const { data: claimed, error: claimError } = await supabase.from("generated_quiz_questions")
    .update({ answered_at: new Date().toISOString() })
    .eq("id", stored.id).is("answered_at", null).select("id").maybeSingle();
  if (claimError) return NextResponse.json({ error: claimError.message }, { status: 500 });
  if (!claimed) return NextResponse.json({ error: "Question has already been answered" }, { status: 409 });
  const { error: insertError } = await supabase.from("module_quiz_attempts").insert({
    user_id: user.userId,
    module_id: moduleData.id,
    question_level: questionLevel,
    question,
    selected_option: body.data.selected_option,
    correct,
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

  const { data: sourceDocument } = await supabase.from("rule_documents").select("title").eq("id", question.sourceDocumentId).maybeSingle();

  return NextResponse.json({
    ok: true,
    module_id: moduleData.id,
    correct,
    answer: question.answer,
    explanation: question.explanation,
    rule_reference: question.ruleReference,
    source_excerpt: question.sourceExcerpt,
    source_title: sourceDocument?.title || "Official rule source",
    latest_attempts_count: score.latestAttemptsCount,
    latest_correct_count: score.latestCorrectCount,
    latest_score_percent: score.latestScorePercent,
    passed,
    passed_at: passedAt,
  });
}
