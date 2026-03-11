import { NextResponse } from "next/server";
import { searchRules } from "../../../lib/rag";
import { llmChat } from "../../../lib/llm";
import { assertEnv, formatRuleContext } from "../../../lib/utils";
import { moduleContent } from "../../../lib/module-content";

export const runtime = "nodejs";

// Helper to get static module content as context string for a specific category
function getStaticModuleContext(category: string): string {
  const modules = Object.values(moduleContent).filter(m => m.category === category);
  return modules
    .map(mod =>
      `[${mod.category.toUpperCase()}] ${mod.title}\n` +
      mod.lessons
        .map(l => `${l.title}: ${l.content.join(" ")}${l.vcNote ? ` VC Note: ${l.vcNote}` : ""}`)
        .join("\n\n")
    )
    .join("\n\n---\n\n");
}

export async function POST(request: Request) {
  assertEnv(["OPENAI_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);
  const { message } = await request.json();
  if (!message) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  // Search RAG for relevant rule chunks
  let hits: { chunk: string; similarity: number }[] = [];
  try {
    hits = await searchRules(message, 4);
  } catch {
    // RAG unavailable — will rely on static content
  }
  const ragContext = formatRuleContext(hits);

  // Detect if the user is asking about a specific format and supplement with static content
  const msgLower = message.toLowerCase();
  let staticContext = "";
  if (msgLower.includes("4v4") || msgLower.includes("4 v 4") || (msgLower.includes("rallyball") && !msgLower.includes("6v6"))) {
    staticContext = getStaticModuleContext("rallyball-4v4");
  }
  if (msgLower.includes("6v6") || msgLower.includes("6 v 6") || (msgLower.includes("rallyball") && !msgLower.includes("4v4"))) {
    staticContext += (staticContext ? "\n\n---\n\n" : "") + getStaticModuleContext("rallyball-6v6");
  }
  if (msgLower.includes("beach") || msgLower.includes("sand") || msgLower.includes("outdoor volleyball")) {
    staticContext += (staticContext ? "\n\n---\n\n" : "") + getStaticModuleContext("beach");
  }
  if (msgLower.includes("tripleball") || msgLower.includes("triple ball")) {
    // Tripleball exists in both 4v4 and 6v6
    if (!staticContext.includes("4v4")) staticContext += (staticContext ? "\n\n---\n\n" : "") + getStaticModuleContext("rallyball-4v4");
    if (!staticContext.includes("6v6")) staticContext += (staticContext ? "\n\n---\n\n" : "") + getStaticModuleContext("rallyball-6v6");
  }

  const combinedContext = [ragContext, staticContext].filter(Boolean).join("\n\n---\n\n");

  const answer = await llmChat([
    {
      role: "system",
      content:
        "You are a volleyball officiating tutor knowledgeable about Indoor 6v6, 4v4 Rallyball (OVA), 6v6 Rallyball (OVA), and Beach Volleyball (FIVB). Answer concisely with rule citations. Use provided snippets as ground truth. When the user asks about a specific format (4v4, 6v6 Rallyball, or Beach), make sure your answer is specific to that format's rules — do NOT confuse indoor rules with beach or rallyball rules."
    },
    { role: "user", content: `User question: ${message}\n\nRule snippets:\n${combinedContext}` }
  ]);

  return NextResponse.json({ answer, references: hits });
}

