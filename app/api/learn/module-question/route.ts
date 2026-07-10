import { NextResponse } from "next/server";
import { requireUserFromRequest, requestUserQuestionLevel } from "../../../../lib/auth";
import { getModuleBySlug } from "../../../../lib/module-content";
import { llmChat } from "../../../../lib/llm";
import { searchRules } from "../../../../lib/rag";
import { assertEnv, formatRuleContext } from "../../../../lib/utils";
import { type QuestionLevel } from "../../../../lib/learning";
import { getServerSupabase } from "../../../../lib/supabase";
import {
  assessQuizQuestionNovelty,
  getRecentQuizQuestionHistory,
  type QuizQuestionNovelty,
} from "../../../../lib/quiz-question-history";

export const runtime = "nodejs";

type GeneratedModuleQuestion = {
  question_level: QuestionLevel;
  module_id: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  rule_reference: string;
};

function parseJsonObject(content: string) {
  let jsonContent = content.trim();
  if (jsonContent.startsWith("```json")) {
    jsonContent = jsonContent.slice(7);
  } else if (jsonContent.startsWith("```")) {
    jsonContent = jsonContent.slice(3);
  }
  if (jsonContent.endsWith("```")) {
    jsonContent = jsonContent.slice(0, -3);
  }
  return JSON.parse(jsonContent.trim());
}

function buildAvoidBlock(questions: string[]) {
  const uniqueAvoid = Array.from(new Set(questions.filter((q) => q.trim()))).slice(0, 50);
  return uniqueAvoid.length
    ? `\n\nPREVIOUSLY ASKED OR REJECTED QUESTIONS — the user has already answered these or they were too similar. DO NOT repeat, rephrase, or ask about the same specific scenario as any of them:\n${uniqueAvoid
        .map((q, i) => `${i + 1}. ${q}`)
        .join("\n")}\nYour new question MUST test a different rule detail or game situation than every question listed above.`
    : "";
}

function levelGuidance(questionLevel: QuestionLevel) {
  if (questionLevel === "beginner") {
    return `
BEGINNER / LEVEL 1 REFEREE FOCUS:
- Ask a clear, practical question for a newer referee.
- Focus on fundamental calls, basic match procedure, common faults, court/position basics, scoring, or obvious signal recognition.
      - Avoid rare edge cases, multi-fault priority analysis, and advanced libero/back-row judgment unless the module requires a simple version.`;
  }

  if (questionLevel === "hard") {
    return `
ADVANCED / LEVEL 3-4 REFEREE FOCUS:
- Ask a high-judgment match scenario with interacting rules or officiating mechanics.
- Include details such as timing, sequence of events, player restrictions, sanctions, screening, libero/back-row nuance, replay vs point, or referee responsibilities.
- Wrong answers should be plausible even to an experienced referee.`;
  }

  return `
INTERMEDIATE / LEVEL 2 REFEREE FOCUS:
- Ask a realistic match scenario that requires applying more than one rule or referee mechanic.
- Include judgment details such as timing, player position, front/back row status, libero restriction, sanctions, screening, or sequence of events.
- Wrong answers should be plausible mistakes an experienced but developing referee might make.`;
}

function normalizeGeneratedModuleQuestion(
  content: string,
  questionLevel: QuestionLevel,
  moduleId: string,
  fallbackRuleReference: string
): GeneratedModuleQuestion {
  const parsed = parseJsonObject(content);
  if (!parsed.question || !Array.isArray(parsed.options) || parsed.options.length !== 4 || !parsed.answer || !parsed.explanation) {
    throw new Error("Missing required quiz fields");
  }

  const options: string[] = parsed.options.map((o: unknown) => String(o).trim());
  let answer = String(parsed.answer).trim();
  if (!options.includes(answer)) {
    const match = options.find((o) => o.toLowerCase() === answer.toLowerCase());
    answer = match || options[0];
  }

  return {
    question_level: questionLevel,
    module_id: moduleId,
    question: String(parsed.question),
    options,
    answer,
    explanation: String(parsed.explanation),
    rule_reference: parsed.rule_reference ? String(parsed.rule_reference) : fallbackRuleReference,
  };
}

export async function POST(request: Request) {
  assertEnv(["OPENAI_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);
  const user = await requireUserFromRequest(request);
  if (!user.ok) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }

  let body: { module_id?: string; recent_questions?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const moduleData = body.module_id ? getModuleBySlug(body.module_id) : undefined;
  if (!moduleData) {
    return NextResponse.json({ error: "Valid module_id required" }, { status: 400 });
  }

  const questionLevel = requestUserQuestionLevel(user);
  const supabase = getServerSupabase();

  // Build a list of this user's recently asked questions for the module so the
  // model doesn't keep regenerating the same handful (worst on small modules
  // like 4v4/6v6 Rallyball).
  const avoidQuestions: string[] = [];
  const clientRecent = Array.isArray(body.recent_questions) ? body.recent_questions : [];
  for (const q of clientRecent) {
    if (typeof q === "string" && q.trim()) avoidQuestions.push(q.trim());
  }
  try {
    avoidQuestions.push(
      ...(await getRecentQuizQuestionHistory({
        supabase,
        userId: user.userId,
        scope: "module",
        moduleId: moduleData.id,
      }))
    );
    if (avoidQuestions.length === 0) {
      throw new Error("No quiz history rows found");
    }
  } catch {
    try {
      const { data: recentAttempts } = await supabase
        .from("module_quiz_attempts")
        .select("question")
        .eq("user_id", user.userId)
        .eq("module_id", moduleData.id)
        .order("created_at", { ascending: false })
        .limit(20);
      for (const row of recentAttempts || []) {
        const text = (row.question as { question?: string } | null)?.question;
        if (typeof text === "string" && text.trim()) avoidQuestions.push(text.trim());
      }
    } catch {
      // History lookup is best-effort; generation still works without it.
    }
  }

  const lessonsContext = moduleData.lessons
    .map((l) => `${l.title}: ${l.content.join(" ")}`)
    .join("\n\n");

  let ragContext = "";
  try {
    const chunks = await searchRules(`${moduleData.title} ${moduleData.ruleRange}`, 4);
    ragContext = formatRuleContext(chunks);
  } catch (e) {
    console.warn("RAG search unavailable, using static module content:", e);
  }

  const randomSeed = Math.floor(Math.random() * 100000);
  const focusLesson = moduleData.lessons[Math.floor(Math.random() * moduleData.lessons.length)];
  const context = [lessonsContext, ragContext].filter(Boolean).join("\n\n---\n\n");

  const system = `You are a Volleyball Canada referee instructor creating one multiple-choice module quiz question.
Return ONLY valid JSON in this exact shape:
{
  "question": "Question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "answer": "The exact correct option text",
  "explanation": "Brief explanation with rule reference",
  "rule_reference": "Rule or module reference"
}
${levelGuidance(questionLevel)}
The answer must exactly match one option. Do not include markdown or text outside JSON.`;

  const rejectedQuestions: string[] = [];
  const duplicateCandidates: Array<{
    question: GeneratedModuleQuestion;
    novelty: QuizQuestionNovelty;
  }> = [];
  let lastContent = "";
  let lastParseError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const avoidBlock = buildAvoidBlock([...avoidQuestions, ...rejectedQuestions]);
    let content: string;
    try {
      content = await llmChat(
        [
          {
            role: "system",
            content: system,
          },
          {
            role: "user",
            content: `Create a ${questionLevel} question for module "${moduleData.title}" (${moduleData.ruleRange}). Focus topic: "${focusLesson.title}". Random seed: ${randomSeed + attempt}.

Generation attempt: ${attempt + 1}. Use a substantially different scenario, rule detail, and answer pattern than any previously asked or rejected item.

Context:
${context}${avoidBlock}`,
          },
        ],
        questionLevel === "beginner" ? "gpt-4o-mini" : "gpt-4o",
        { temperature: questionLevel === "beginner" ? 0.8 : 0.9 }
      );
    } catch (llmError) {
      return NextResponse.json(
        { error: "Failed to generate question from LLM", details: (llmError as Error).message },
        { status: 500 }
      );
    }

    lastContent = content;
    let question: GeneratedModuleQuestion;
    try {
      question = normalizeGeneratedModuleQuestion(
        content,
        questionLevel,
        moduleData.id,
        moduleData.ruleRange
      );
    } catch (error) {
      lastParseError = error as Error;
      continue;
    }

    const novelty = await assessQuizQuestionNovelty({
      supabase,
      userId: user.userId,
      scope: "module",
      moduleId: moduleData.id,
      questionText: question.question,
    });

    if (!novelty.duplicate) {
      return NextResponse.json(question);
    }

    duplicateCandidates.push({ question, novelty });
    rejectedQuestions.push(question.question);
  }

  if (duplicateCandidates.length > 0) {
    const leastSimilar = duplicateCandidates.sort(
      (a, b) => a.novelty.maxSimilarity - b.novelty.maxSimilarity
    )[0];
    return NextResponse.json(leastSimilar.question);
  }

  return NextResponse.json(
    {
      error: "Failed to parse model response as JSON",
      details: lastParseError?.message,
      raw: lastContent,
    },
    { status: 500 }
  );
}
