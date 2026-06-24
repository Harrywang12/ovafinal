import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "../../../../lib/admin";
import { normalizeRefereeLevel } from "../../../../lib/learning";
import { getAllModules } from "../../../../lib/module-content";
import { getServerSupabase } from "../../../../lib/supabase";
import { assertEnv } from "../../../../lib/utils";

export const runtime = "nodejs";

type ProfileRow = {
  user_id: string;
  email: string | null;
  referee_level: string | null;
};

type AssignmentRow = {
  user_id: string;
  module_id: string;
  assigned_at: string | null;
};

export async function GET(request: Request) {
  assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);
  const admin = await requireAdminFromRequest(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const supabase = getServerSupabase();
  const [{ data: profiles, error: profileError }, { data: assignments, error: assignmentError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, email, referee_level")
        .order("email", { ascending: true }),
      supabase
        .from("module_assignments")
        .select("user_id, module_id, assigned_at")
        .order("assigned_at", { ascending: false }),
    ]);

  const error = profileError || assignmentError;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    modules: getAllModules().map((module) => ({
      id: module.id,
      title: module.title,
      category: module.category,
      chapterLabel: module.chapterLabel || `Ch. ${module.chapter}`,
    })),
    learners: ((profiles || []) as ProfileRow[]).map((profile) => ({
      user_id: profile.user_id,
      email: profile.email,
      referee_level: normalizeRefereeLevel(profile.referee_level),
      assigned_module_ids: ((assignments || []) as AssignmentRow[])
        .filter((row) => row.user_id === profile.user_id)
        .map((row) => row.module_id),
    })),
  });
}

export async function POST(request: Request) {
  assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);
  const admin = await requireAdminFromRequest(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  let body: {
    action?: "assign" | "unassign";
    user_ids?: string[];
    module_ids?: string[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = body.action;
  const userIds = Array.isArray(body.user_ids) ? Array.from(new Set(body.user_ids.filter(Boolean))) : [];
  const moduleIds = Array.isArray(body.module_ids) ? Array.from(new Set(body.module_ids.filter(Boolean))) : [];
  const validModuleIds = new Set(getAllModules().map((module) => module.id));

  if (action !== "assign" && action !== "unassign") {
    return NextResponse.json({ error: "action must be assign or unassign" }, { status: 400 });
  }
  if (userIds.length === 0 || moduleIds.length === 0) {
    return NextResponse.json({ error: "user_ids and module_ids are required" }, { status: 400 });
  }
  if (moduleIds.some((id) => !validModuleIds.has(id))) {
    return NextResponse.json({ error: "Invalid module_id in module_ids" }, { status: 400 });
  }

  const supabase = getServerSupabase();

  if (action === "assign") {
    const rows = userIds.flatMap((userId) =>
      moduleIds.map((moduleId) => ({
        user_id: userId,
        module_id: moduleId,
        assigned_by: admin.userId,
      }))
    );

    const { error } = await supabase
      .from("module_assignments")
      .upsert(rows, { onConflict: "user_id,module_id" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await supabase
      .from("module_assignments")
      .delete()
      .in("user_id", userIds)
      .in("module_id", moduleIds);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
