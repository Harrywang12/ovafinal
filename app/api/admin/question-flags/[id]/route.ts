import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminFromRequest } from "../../../../../lib/admin";
import { getServerSupabase } from "../../../../../lib/supabase";

const schema = z.object({ status: z.enum(["resolved", "dismissed"]), reviewNotes: z.string().trim().max(2000).optional() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminFromRequest(request);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid review" }, { status: 400 });
  const { id } = await params;
  const { error } = await getServerSupabase().from("quiz_question_flags").update({
    status: parsed.data.status, review_notes: parsed.data.reviewNotes || null,
    reviewed_by: admin.userId, reviewed_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
