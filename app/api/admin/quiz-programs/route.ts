import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "../../../../lib/admin";
import { quizProgramInputSchema } from "../../../../lib/quiz-programs";
import { getServerSupabase } from "../../../../lib/supabase";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const admin = await requireAdminFromRequest(request);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from("quiz_programs").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ programs: data || [] });
}

export async function POST(request: Request) {
  const admin = await requireAdminFromRequest(request);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
  const parsed = quizProgramInputSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid program" }, { status: 400 });
  const value = parsed.data;
  const { data, error } = await getServerSupabase().from("quiz_programs").insert({
    title: value.title,
    discipline: value.discipline,
    referee_level: value.refereeLevel,
    required_quiz_count: value.requiredQuizCount,
    questions_per_quiz: value.questionsPerQuiz,
    minimum_score_percent: value.minimumScorePercent,
    start_at: value.startAt || null,
    due_at: value.dueAt || null,
    topic_blueprint: value.topicBlueprint,
    difficulty_progression: value.difficultyProgression,
    created_by: admin.userId,
  }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ program: data }, { status: 201 });
}
