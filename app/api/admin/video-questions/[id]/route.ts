import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../../../lib/supabase";
import { assertEnv } from "../../../../../lib/utils";
import { requireAdminFromRequest } from "../../../../../lib/admin";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);

  const admin = await requireAdminFromRequest(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Whitelist fields to prevent accidental mass-update
  const allowed = [
    "kind",
    "difficulty",
    "video_url",
    "pause_at_seconds",
    "options",
    "correct_option_index",
    "explanation",
    "rule_reference",
    "is_weekly",
  ] as const;

  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      updates[key] = body[key];
    }
  }

  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("video_questions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ question: data });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);

  const admin = await requireAdminFromRequest(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const supabase = getServerSupabase();
  const { error } = await supabase.from("video_questions").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
