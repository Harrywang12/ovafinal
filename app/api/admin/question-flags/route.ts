import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "../../../../lib/admin";
import { getServerSupabase } from "../../../../lib/supabase";
import { selectAllRows } from "../../../../lib/supabase-pagination";

type FlagRow = { id: string; user_id: string; [key: string]: unknown };
type ProfileRow = { user_id: string; email: string | null; referee_level: string | null };

export async function GET(request: Request) {
  const admin = await requireAdminFromRequest(request);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
  const reason = new URL(request.url).searchParams.get("reason");
  const supabase = getServerSupabase();
  try {
    const [flags, profiles] = await Promise.all([
      selectAllRows<FlagRow>((from, to) => {
        let query = supabase.from("quiz_question_flags").select(`
          *,
          session_question:quiz_session_questions(question_data, quiz_session_id),
          generated_question:generated_quiz_questions(question_data)
        `).order("created_at", { ascending: false }).order("id");
        if (reason) query = query.eq("reason", reason);
        return query.range(from, to);
      }),
      selectAllRows<ProfileRow>((from, to) => supabase
        .from("profiles").select("user_id, email, referee_level").order("user_id").range(from, to)),
    ]);
    const profileByUser = new Map(profiles.map((profile) => [profile.user_id, profile]));
    return NextResponse.json({ flags: flags.map((flag) => ({
      ...flag,
      profile: profileByUser.get(flag.user_id) || null,
    })) });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
