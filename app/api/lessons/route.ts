import { NextResponse } from "next/server";
import { searchRules } from "../../../lib/rag";
import { llmChat } from "../../../lib/llm";
import { assertEnv, formatRuleContext } from "../../../lib/utils";
import { getModuleBySlug } from "../../../lib/module-content";

export const runtime = "nodejs";

export async function POST(request: Request) {
  assertEnv(["OPENAI_API_KEY"]);
  const { module } = await request.json();
  if (!module) {
    return NextResponse.json({ error: "module required" }, { status: 400 });
  }

  // Get static module content
  const moduleData = getModuleBySlug(module);
  
  // Build context from static lessons
  const lessonsContext = moduleData?.lessons
    .map(l => `${l.title}: ${l.content.join(" ")}`)
    .join("\n\n") || "";

  // Try to get additional context from rules embeddings (optional enhancement)
  let ragContext = "";
  try {
    const chunks = await searchRules(module, 3);
    ragContext = formatRuleContext(chunks);
  } catch (e) {
    // RAG is optional - continue without it
    console.warn("RAG search unavailable, using static content:", e);
  }

  // Combine contexts, preferring RAG when available
  const finalContext = ragContext || lessonsContext || `General volleyball ${module} rules and scenarios.`;

  const quiz = await llmChat([
    {
      role: "system",
      content: `You are a volleyball officiating quiz generator. Create a micro-quiz for volleyball referees.
You MUST respond with ONLY valid JSON in this exact format:
{
  "question": "Your question here?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "answer": "The correct option text exactly as in options array",
  "explanation": "Brief explanation of why this is correct, citing rules."
}
Do not include any text before or after the JSON.`
    },
    { role: "user", content: `Create a quiz question for the "${module}" module based on this context:\n\n${finalContext}` }
  ]);

  // Return lessons from static content (for backwards compatibility)
  const lessons = moduleData?.lessons.map(l => ({
    id: l.id,
    title: l.title,
    content: l.content[0], // First paragraph as summary
    module: module
  })) || [];

  return NextResponse.json({ lessons, quiz });
}
