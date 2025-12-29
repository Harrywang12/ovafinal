import { NextResponse } from "next/server";
import { searchRules } from "../../../lib/rag";
import { llmChat } from "../../../lib/llm";
import { assertEnv, formatRuleContext } from "../../../lib/utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  assertEnv(["OPENAI_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);
  const { message } = await request.json();
  if (!message) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  const hits = await searchRules(message, 4);
  const context = formatRuleContext(hits);

  const answer = await llmChat([
    {
      role: "system",
      content:
        "You are a volleyball officiating tutor. Answer concisely with rule citations. Use provided snippets as ground truth."
    },
    { role: "user", content: `User question: ${message}\n\nRule snippets:\n${context}` }
  ]);

  return NextResponse.json({ answer, references: hits });
}
