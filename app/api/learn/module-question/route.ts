import { NextResponse } from "next/server";
import { requireUserFromRequest, requestUserQuestionLevel } from "../../../../lib/auth";
import { getModuleBySlug } from "../../../../lib/module-content";
import { llmChat } from "../../../../lib/llm";
import { searchRules } from "../../../../lib/rag";
import { assertEnv, formatRuleContext } from "../../../../lib/utils";
import { type QuestionLevel } from "../../../../lib/learning";

export const runtime = "nodejs";

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

export async function POST(request: Request) {
  assertEnv(["OPENAI_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);
  const user = await requireUserFromRequest(request);
  if (!user.ok) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }

  let body: { module_id?: string };
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

  const content = await llmChat(
    [
      {
        role: "system",
        content: `You are a Volleyball Canada referee instructor creating one multiple-choice module quiz question.
Return ONLY valid JSON in this exact shape:
{
  "question": "Question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "answer": "The exact correct option text",
  "explanation": "Brief explanation with rule reference",
  "rule_reference": "Rule or module reference"
}
${levelGuidance(questionLevel)}
The answer must exactly match one option. Do not include markdown or text outside JSON.`,
      },
      {
        role: "user",
        content: `Create a ${questionLevel} question for module "${moduleData.title}" (${moduleData.ruleRange}). Focus topic: "${focusLesson.title}". Random seed: ${randomSeed}.

Context:
${context}`,
      },
    ],
    questionLevel === "beginner" ? "gpt-4o-mini" : "gpt-4o",
    { temperature: questionLevel === "beginner" ? 0.65 : 0.8 }
  );

  try {
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

    return NextResponse.json({
      question_level: questionLevel,
      module_id: moduleData.id,
      question: String(parsed.question),
      options,
      answer,
      explanation: String(parsed.explanation),
      rule_reference: parsed.rule_reference ? String(parsed.rule_reference) : moduleData.ruleRange,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to parse model response as JSON", details: (error as Error).message, raw: content },
      { status: 500 }
    );
  }
}
