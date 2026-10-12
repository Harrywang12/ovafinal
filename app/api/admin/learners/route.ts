import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminFromRequest } from "../../../../lib/admin";
import { refereeLevelSchema } from "../../../../lib/quiz-programs";
import { getServerSupabase } from "../../../../lib/supabase";

export const runtime = "nodejs";

const updateSchema = z.object({
  user_id: z.string().uuid(),
  referee_level: refereeLevelSchema,
});

/**
 * Learners choose a starting level at signup; admins own it afterwards
 * because it controls question difficulty and source eligibility.
 */
export async function PATCH(request: Request) {
  const admin = await requireAdminFromRequest(request);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid learner update" }, { status: 400 });

  const { data, error } = await getServerSupabase()
    .from("profiles")
    .update({ referee_level: parsed.data.referee_level })
    .eq("user_id", parsed.data.user_id)
    .select("user_id, referee_level")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Learner not found" }, { status: 404 });
  return NextResponse.json({ learner: data });
}
