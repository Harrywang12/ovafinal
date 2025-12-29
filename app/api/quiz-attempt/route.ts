import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabase";
import { assertEnv } from "../../../lib/utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);
  const body = await request.json();
  const { user_id, question, selected_option, correct } = body;
  if (!question || selected_option === undefined) {
    return NextResponse.json({ error: "question and selected_option required" }, { status: 400 });
  }

  const supabase = getServerSupabase();
  const { error } = await supabase.from("quiz_attempts").insert({
    user_id,
    question,
    selected_option,
    correct
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
