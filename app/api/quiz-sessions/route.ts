import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserFromRequest } from "../../../lib/auth";
import { QuizGenerationError, generateGroundedQuizQuestion } from "../../../lib/quiz-generation";
import { allocateDifficulties, difficultyProgressionSchema, expandTopicBlueprint, topicBlueprintItemSchema } from "../../../lib/quiz-programs";
import { publicQuizQuestion, toStructuredHistory } from "../../../lib/quiz-sessions";
import { enforceGenerationQuota } from "../../../lib/rate-limit";
import { getServerSupabase } from "../../../lib/supabase";
import { assertEnv } from "../../../lib/utils";

export const runtime = "nodejs";
export const maxDuration = 300;

const inputSchema = z.object({ assignmentId: z.string().uuid() });

export async function POST(request: Request) {
  let sessionId: string | null = null;
  try {
    assertEnv(["OPENAI_API_KEY", "SUPABASE_SERVICE_KEY", "SUPABASE_URL"]);
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
      .select("id, status").eq("quiz_program_id", program.id).eq("user_id", user.userId);
    if (previousError) throw previousError;
    const completed = (previous || []).filter((session) => session.status === "submitted").length;
    if (completed >= program.required_quiz_count) return NextResponse.json({ error: "All required quizzes are complete" }, { status: 409 });
    const existingActive = (previous || []).find((session) => ["generating", "ready", "in_progress"].includes(session.status));
    if (existingActive) return NextResponse.json({ sessionId: existingActive.id, existing: true }, { status: 200 });

    const blueprint = z.array(topicBlueprintItemSchema).parse(program.topic_blueprint);
    const topics = expandTopicBlueprint(blueprint);
    if (topics.length !== program.questions_per_quiz) throw new Error("Stored topic blueprint does not match questions_per_quiz");
    const progression = difficultyProgressionSchema.parse(program.difficulty_progression);
    const quizNumber = completed + 1;
    const mix = progression.find((step) => step.throughQuiz === null || quizNumber <= step.throughQuiz)?.mix;
    if (!mix) throw new Error("Difficulty progression does not cover this quiz number");
    const difficulties = allocateDifficulties(topics.length, mix);
    await enforceGenerationQuota(supabase, user.userId, topics.length, { hourly: 40, daily: 120 });

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

    const generated = [];
    for (let index = 0; index < topics.length; index += 1) {
      const question = await generateGroundedQuizQuestion({
        supabase,
        userId: user.userId,
        discipline: program.discipline,
        refereeLevel: program.referee_level,
        difficulty: difficulties[index],
        topic: topics[index],
        quizSessionId: session.id,
        sessionHistory: generated.map(toStructuredHistory),
      });
      generated.push(question);
    }

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

    return NextResponse.json({
      session: { id: session.id, quizNumber, title: program.title, discipline: program.discipline, refereeLevel: program.referee_level, status: "ready" },
      questions: (storedQuestions || []).map(publicQuizQuestion),
    }, { status: 201 });
  } catch (error) {
    if (sessionId) await getServerSupabase().from("quiz_sessions").update({ status: "generation_failed" }).eq("id", sessionId);
    const status = error instanceof QuizGenerationError ? error.status : 500;
    const code = error instanceof QuizGenerationError ? error.code : "QUIZ_SESSION_GENERATION_FAILED";
    return NextResponse.json({ code, message: error instanceof Error ? error.message : "Quiz session generation failed" }, { status });
  }
}
