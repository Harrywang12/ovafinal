import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserFromRequest } from "../../../lib/auth";
import { difficultyLabel, questionLevelForDifficulty } from "../../../lib/learning";
import { getOrCreateAdaptiveQuizState } from "../../../lib/quiz-adaptive";
import { QuizGenerationError, generateGroundedQuizQuestion } from "../../../lib/quiz-generation";
import { quizDifficultySchema, quizDisciplineSchema } from "../../../lib/quiz-programs";
import { enforceGenerationQuota } from "../../../lib/rate-limit";
import { getServerSupabase } from "../../../lib/supabase";
import { assertEnv } from "../../../lib/utils";

export const runtime = "nodejs";

const requestSchema = z.object({
  discipline: quizDisciplineSchema,
  refereeLevel: z.string().optional(),
  difficulty: quizDifficultySchema.optional(),
  quizSessionId: z.string().uuid().optional(),
  topic: z.string().trim().min(1).optional(),
});

const DEFAULT_TOPICS = {
  indoor: ["service_and_service_order", "playing_actions", "interruptions", "misconduct", "signals_and_procedures", "rotations_and_positioning"],
  beach: ["service_and_service_order", "playing_actions", "interruptions", "misconduct", "signals_and_procedures", "playing_area_and_equipment"],
} as const;

function adaptiveDifficulty(value: "easy" | "medium" | "hard") {
  return value === "easy" ? "basic" : value === "hard" ? "advanced" : "applied";
}

export async function POST(request: Request) {
  try {
    assertEnv(["OPENAI_API_KEY", "SUPABASE_SERVICE_KEY", "SUPABASE_URL"]);
    const user = await requireUserFromRequest(request);
    if (!user.ok) return NextResponse.json({ error: user.error }, { status: user.status });

    const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ code: "INVALID_REQUEST", message: parsed.error.issues[0]?.message || "Invalid request" }, { status: 400 });
    }
    if (parsed.data.quizSessionId) {
      return NextResponse.json({ code: "SESSION_GENERATION_REQUIRED", message: "Assigned quiz questions are generated through the quiz session endpoint." }, { status: 400 });
    }

    const supabase = getServerSupabase();
    await enforceGenerationQuota(supabase, user.userId);
    const state = await getOrCreateAdaptiveQuizState(supabase, user.userId, user.refereeLevel);
    const difficulty = parsed.data.difficulty ?? adaptiveDifficulty(state.current_difficulty);
    const topics = DEFAULT_TOPICS[parsed.data.discipline];
    const requestedTopic = parsed.data.topic;
    const topic = requestedTopic && (topics as readonly string[]).includes(requestedTopic)
      ? requestedTopic
      : topics[Math.floor(Math.random() * topics.length)];

    const question = await generateGroundedQuizQuestion({
      supabase,
      userId: user.userId,
      discipline: parsed.data.discipline,
      refereeLevel: user.refereeLevel,
      difficulty,
      topic,
    });
    const { data: stored, error } = await supabase.from("generated_quiz_questions").insert({
      user_id: user.userId,
      question_data: question,
    }).select("id").single();
    if (error) throw error;

    const { answer: _answer, explanation: _explanation, sourceExcerpt: _sourceExcerpt, ...publicQuestion } = question;
    return NextResponse.json({
      ...publicQuestion,
      id: stored.id,
      adaptive_difficulty: state.current_difficulty,
      difficulty_label: difficultyLabel(state.current_difficulty),
      question_level: questionLevelForDifficulty(state.current_difficulty),
    });
  } catch (error) {
    const status = error instanceof QuizGenerationError ? error.status : Number((error as { status?: number }).status) || 500;
    const code = error instanceof QuizGenerationError ? error.code : (error as { code?: string }).code || "QUESTION_GENERATION_FAILED";
    return NextResponse.json({ code, message: error instanceof Error ? error.message : "Question generation failed" }, { status });
  }
}
