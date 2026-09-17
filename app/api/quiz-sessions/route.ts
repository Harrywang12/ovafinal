import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserFromRequest } from "../../../lib/auth";
import { QuizGenerationError, generateGroundedQuizQuestion, planGroundedQuizBlueprints } from "../../../lib/quiz-generation";
import { recordQuizQuestionHistory } from "../../../lib/quiz-question-history";
import { allocateDifficulties, difficultyProgressionSchema, expandTopicBlueprint, topicBlueprintItemSchema } from "../../../lib/quiz-programs";
import { publicQuizQuestion } from "../../../lib/quiz-sessions";
import { AI_CONFIG } from "../../../lib/ai-config";
import { enforceGenerationQuota, RateLimitError } from "../../../lib/rate-limit";
import { getServerSupabase } from "../../../lib/supabase";
import { assertEnv } from "../../../lib/utils";

export const runtime = "nodejs";
export const maxDuration = 300;

const inputSchema = z.object({ assignmentId: z.string().uuid() });

async function mapWithConcurrency<T, R>(values: T[], concurrency: number, worker: (value: T, index: number) => Promise<R>) {
  const output = new Array<R>(values.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (next < values.length) {
      const index = next++;
      output[index] = await worker(values[index], index);
    }
  }));
  return output;
}

export async function POST(request: Request) {
  let sessionId: string | null = null;
  try {
    assertEnv(["DEEPSEEK_API_KEY", "SUPABASE_SERVICE_KEY", "SUPABASE_URL"]);
    const user = await requireUserFromRequest(request);
    if (!user.ok) return NextResponse.json({ error: user.error }, { status: user.status });
    const parsed = inputSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "A valid assignmentId is required" }, { status: 400 });

    const supabase = getServerSupabase();
    const { data: assignment, error } = await supabase.from("quiz_program_assignments")
      .select("id, user_id, completed_at, program:quiz_programs(*)")
      .eq("id", parsed.data.assignmentId).eq("user_id", user.userId).maybeSingle();
    if (error) throw error;
    if (!assignment) return NextResponse.json({ error: "Quiz assignment not found" }, { status: 404 });
    const program = Array.isArray(assignment.program) ? assignment.program[0] : assignment.program;
    if (!program || program.archived_at) return NextResponse.json({ error: "Quiz program is unavailable" }, { status: 409 });
    const now = Date.now();
    if (program.start_at && Date.parse(program.start_at) > now) return NextResponse.json({ error: "This quiz program has not started" }, { status: 409 });
    if (program.due_at && Date.parse(program.due_at) < now) return NextResponse.json({ error: "This quiz program is overdue" }, { status: 409 });

    const { data: previous, error: previousError } = await supabase.from("quiz_sessions")
      .select("id, status, passed").eq("quiz_program_id", program.id).eq("user_id", user.userId);
    if (previousError) throw previousError;
    const attempted = (previous || []).filter((session) => session.status === "submitted").length;
    const completed = (previous || []).filter((session) => session.status === "submitted" && session.passed === true).length;
    if (completed >= program.required_quiz_count) return NextResponse.json({ error: "All required quizzes are complete" }, { status: 409 });
    const existingActive = (previous || []).find((session) => ["generating", "ready", "in_progress"].includes(session.status));
    if (existingActive) return NextResponse.json({ sessionId: existingActive.id, existing: true }, { status: 200 });

    const blueprint = z.array(topicBlueprintItemSchema).parse(program.topic_blueprint);
    const topics = expandTopicBlueprint(blueprint);
    if (topics.length !== program.questions_per_quiz) throw new Error("Stored topic blueprint does not match questions_per_quiz");
    const progression = difficultyProgressionSchema.parse(program.difficulty_progression);
    const quizNumber = attempted + 1;
    const mix = progression.find((step) => step.throughQuiz === null || quizNumber <= step.throughQuiz)?.mix;
    if (!mix) throw new Error("Difficulty progression does not cover this quiz number");
    const difficulties = allocateDifficulties(topics.length, mix);
    await enforceGenerationQuota(supabase, user.userId, topics.length, {
      feature: "assigned_quiz", hourly: AI_CONFIG.quotas.assignedHourly, daily: AI_CONFIG.quotas.assignedDaily,
    });

    const { data: session, error: createError } = await supabase.from("quiz_sessions").insert({
      quiz_program_id: program.id,
      quiz_program_assignment_id: assignment.id,
      user_id: user.userId,
      discipline: program.discipline,
      referee_level: program.referee_level,
      quiz_number: quizNumber,
      status: "generating",
    }).select("id").single();
    if (createError) throw createError;
    sessionId = session.id;

    const baseGeneration = {
      supabase,
      userId: user.userId,
      discipline: program.discipline,
      refereeLevel: program.referee_level,
      flow: "program" as const,
      quizSessionId: session.id,
    };
    const blueprints = await planGroundedQuizBlueprints(baseGeneration, topics.map((topic, index) => ({
      topic, difficulty: difficulties[index],
    })));
    const generated = await mapWithConcurrency(blueprints, AI_CONFIG.novelty.assignedConcurrency, async (blueprint, index) =>
      generateGroundedQuizQuestion({
        ...baseGeneration,
        difficulty: difficulties[index],
        topic: topics[index],
        blueprint,
      })
    );

    const { data: storedQuestions, error: storeError } = await supabase.from("quiz_session_questions").insert(
      generated.map((question, index) => ({
        quiz_session_id: session.id,
        sequence_number: index + 1,
        question_data: question,
        source_chunk_ids: question.sourceChunkIds,
      }))
    ).select("id, sequence_number, question_data").order("sequence_number");
    if (storeError) throw storeError;
    const { error: readyError } = await supabase.from("quiz_sessions").update({ status: "ready" }).eq("id", session.id).eq("status", "generating");
    if (readyError) throw readyError;
    for (const question of generated) {
      await recordQuizQuestionHistory({
        supabase, userId: user.userId, scope: "program", question, quizSessionId: session.id,
      });
    }

    return NextResponse.json({
      session: { id: session.id, quizNumber, title: program.title, discipline: program.discipline, refereeLevel: program.referee_level, status: "ready" },
      questions: (storedQuestions || []).map(publicQuizQuestion),
    }, { status: 201 });
  } catch (error) {
    if (sessionId) await getServerSupabase().from("quiz_sessions").update({ status: "generation_failed" }).eq("id", sessionId);
    const status = error instanceof QuizGenerationError ? error.status : Number((error as { status?: number }).status) || 500;
    const code = error instanceof QuizGenerationError ? error.code : (error as { code?: string }).code || "QUIZ_SESSION_GENERATION_FAILED";
    const response = NextResponse.json({ code, message: error instanceof Error ? error.message : "Quiz session generation failed" }, { status });
    if (error instanceof RateLimitError) response.headers.set("Retry-After", String(error.retryAfter));
    return response;
  }
}
