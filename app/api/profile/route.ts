import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserFromRequest } from "../../../lib/auth";
import { getServerSupabase } from "../../../lib/supabase";
import { usernameSchema } from "../../../lib/usernames";

export const runtime = "nodejs";

const updateSchema = z.object({ username: usernameSchema });

export async function PATCH(request: Request) {
  const user = await requireUserFromRequest(request);
  if (!user.ok) return NextResponse.json({ error: user.error }, { status: user.status });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid username" }, { status: 400 });

  const { error } = await getServerSupabase()
    .from("profiles")
    .update({ username: parsed.data.username })
    .eq("user_id", user.userId);
  if (error?.code === "23505") return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ username: parsed.data.username });
}
