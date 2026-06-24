import { NextResponse } from "next/server";
import { requireUserFromRequest } from "../../../../../lib/auth";
import { getModuleBySlug } from "../../../../../lib/module-content";
import { getServerSupabase } from "../../../../../lib/supabase";
import { assertEnv } from "../../../../../lib/utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);
  const user = await requireUserFromRequest(request);
  if (!user.ok) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }

  let body: { module_id?: string; lesson_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const module = body.module_id ? getModuleBySlug(body.module_id) : undefined;
  const lesson = module?.lessons.find((l) => l.id === body.lesson_id);
  if (!module || !lesson) {
    return NextResponse.json({ error: "Valid module_id and lesson_id required" }, { status: 400 });
  }

  const supabase = getServerSupabase();
  const { error } = await supabase.from("module_lesson_progress").upsert(
    {
      user_id: user.userId,
      module_id: module.id,
      lesson_id: lesson.id,
      viewed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,module_id,lesson_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
