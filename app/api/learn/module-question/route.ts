import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserFromRequest, requestUserQuestionLevel } from "../../../../lib/auth";
import { QuizGenerationError, generateGroundedQuizQuestion } from "../../../../lib/quiz-generation";
import { getModuleBySlug } from "../../../../lib/module-content";
import { recordQuizQuestionHistory } from "../../../../lib/quiz-question-history";
import type { QuizDifficulty, QuizDiscipline } from "../../../../lib/quiz-programs";
import type { RuleSet } from "../../../../lib/rule-source-classification";
import { getServerSupabase } from "../../../../lib/supabase";
import { assertEnv } from "../../../../lib/utils";

export const runtime = "nodejs";
export const maxDuration = 90;

const inputSchema = z.object({ module_id: z.string().trim().min(1) });

function moduleSource(category: string): { discipline: QuizDiscipline; rulesets: RuleSet[] } {
  if (category === "beach") return { discipline: "beach", rulesets: ["beach"] };
  if (category === "rallyball-4v4") return { discipline: "indoor", rulesets: ["rallyball_4v4", "rallyball_unspecified"] };
  if (category === "rallyball-6v6") return { discipline: "indoor", rulesets: ["rallyball_6v6", "rallyball_unspecified"] };
  return { discipline: "indoor", rulesets: ["standard_indoor"] };
}

function moduleDifficulty(level: "beginner" | "intermediate" | "hard"): QuizDifficulty {
  return level === "beginner" ? "basic" : level === "hard" ? "advanced" : "applied";
}

export async function POST(request: Request) {
  try {
    assertEnv(["OPENAI_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);
    const user = await requireUserFromRequest(request);
    if (!user.ok) return NextResponse.json({ error: user.error }, { status: user.status });
    const parsed = inputSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Valid module_id required" }, { status: 400 });
    const moduleData = getModuleBySlug(parsed.data.module_id);
    if (!moduleData) return NextResponse.json({ error: "Valid module_id required" }, { status: 400 });

    const supabase = getServerSupabase();
    const questionLevel = requestUserQuestionLevel(user);
    const source = moduleSource(moduleData.category);
    const focusLesson = moduleData.lessons[Math.floor(Math.random() * moduleData.lessons.length)];
    const question = await generateGroundedQuizQuestion({
      supabase,
      userId: user.userId,
      discipline: source.discipline,
      refereeLevel: user.refereeLevel,
      difficulty: moduleDifficulty(questionLevel),
      topic: moduleData.id,
      flow: "module",
      moduleId: moduleData.id,
      rulesets: source.rulesets,
      sourceQuery: `${moduleData.title} ${moduleData.ruleRange} ${focusLesson.title}`,
      requireSourceTopic: false,
    });

    const { data: stored, error } = await supabase.from("generated_quiz_questions").insert({
      user_id: user.userId,
      scope: "module",
      module_id: moduleData.id,
      question_data: question,
    }).select("id").single();
    if (error) throw error;
    await recordQuizQuestionHistory({
      supabase, userId: user.userId, scope: "module", moduleId: moduleData.id,
      questionLevel, question,
    });

    return NextResponse.json({
      id: stored.id,
      question_level: questionLevel,
      module_id: moduleData.id,
      question: question.question,
      options: question.options,
      rule_reference: question.ruleReference,
      discipline: question.discipline,
      difficulty: question.difficulty,
      question_style: question.questionStyle,
    });
  } catch (error) {
    const status = error instanceof QuizGenerationError ? error.status : 500;
    const code = error instanceof QuizGenerationError ? error.code : "MODULE_QUESTION_GENERATION_FAILED";
    return NextResponse.json({ code, message: error instanceof Error ? error.message : "Module question generation failed" }, { status });
  }
}
