import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "../../../../lib/admin";
import { getServerSupabase } from "../../../../lib/supabase";

export async function GET(request: Request) {
  const admin = await requireAdminFromRequest(request);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
  const reason = new URL(request.url).searchParams.get("reason");
  const supabase = getServerSupabase();
  let query = supabase.from("quiz_question_flags").select(`
    *,
    session_question:quiz_session_questions(question_data, quiz_session_id),
    generated_question:generated_quiz_questions(question_data)
  `).order("created_at", { ascending: false });
  if (reason) query = query.eq("reason", reason);
  const [{ data, error }, { data: profiles, error: profileError }] = await Promise.all([
    query,
    supabase.from("profiles").select("user_id, email, referee_level"),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
  return NextResponse.json({ flags: (data || []).map((flag) => ({
    ...flag,
    profile: (profiles || []).find((profile) => profile.user_id === flag.user_id) || null,
  })) });
}
