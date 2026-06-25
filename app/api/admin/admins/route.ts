import { NextResponse } from "next/server";
import { z } from "zod";
import { getConfiguredAdminEmails, requireAdminFromRequest } from "../../../../lib/admin";
import { getServerSupabase } from "../../../../lib/supabase";

const emailSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
});

export async function GET(request: Request) {
  const admin = await requireAdminFromRequest(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { data, error } = await getServerSupabase()
    .from("admin_users")
    .select("email, created_at, created_by")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const databaseAdmins = data || [];
  const databaseEmails = new Set(databaseAdmins.map((item) => item.email));
  const configuredAdmins = getConfiguredAdminEmails()
    .filter((email) => !databaseEmails.has(email))
    .map((email) => ({
      email,
      created_at: null,
      created_by: null,
      source: "environment" as const,
    }));

  return NextResponse.json({
    admins: [
      ...databaseAdmins.map((item) => ({ ...item, source: "database" as const })),
      ...configuredAdmins,
    ],
  });
}

export async function POST(request: Request) {
  const admin = await requireAdminFromRequest(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const parsed = emailSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const { data, error } = await getServerSupabase()
    .from("admin_users")
    .upsert(
      {
        email: parsed.data.email,
        created_by: admin.userId,
      },
      { onConflict: "email" }
    )
    .select("email, created_at, created_by")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ admin: data });
}

export async function DELETE(request: Request) {
  const admin = await requireAdminFromRequest(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const parsed = emailSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  if (parsed.data.email === admin.email) {
    return NextResponse.json({ error: "You cannot remove your own admin access" }, { status: 400 });
  }

  if (getConfiguredAdminEmails().includes(parsed.data.email)) {
    return NextResponse.json(
      { error: "This admin is configured through ADMIN_EMAILS and must be removed from the environment variable" },
      { status: 400 }
    );
  }

  const { error } = await getServerSupabase()
    .from("admin_users")
    .delete()
    .eq("email", parsed.data.email);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
