import { NextResponse } from "next/server";
import { searchRules } from "../../../lib/rag";
import { assertEnv } from "../../../lib/utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  assertEnv(["OPENAI_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);
  const { query, limit = 5 } = await request.json();
  if (!query) {
    return NextResponse.json({ error: "query required" }, { status: 400 });
  }
  const results = await searchRules(query, limit);
  return NextResponse.json({ results });
}
