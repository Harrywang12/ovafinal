import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "../../../../lib/admin";
import { calculateQuizProgramStatus } from "../../../../lib/quiz-programs";
import { getServerSupabase } from "../../../../lib/supabase";

type MetricKey = "topic" | "subtopic" | "ruleId" | "scenarioType" | "refereeRole" | "difficulty";

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function GET(request: Request) {
  const admin = await requireAdminFromRequest(request);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
  const params = new URL(request.url).searchParams;
  const supabase = getServerSupabase();
  const [{ data: assignments, error: assignmentError }, { data: sessions, error: sessionError }, { data: answers, error: answerError }, { data: profiles, error: profileError }] = await Promise.all([
    supabase.from("quiz_program_assignments").select("id, user_id, assigned_at, program:quiz_programs(*)"),
    supabase.from("quiz_sessions").select("id, quiz_program_id, user_id, status, score_percent, passed, submitted_at, created_at").order("created_at", { ascending: false }),
    supabase.from("quiz_session_answers").select("correct, answered_at, question:quiz_session_questions(quiz_session_id, question_data)"),
    supabase.from("profiles").select("user_id, email, referee_level"),
  ]);
  const error = assignmentError || sessionError || answerError || profileError;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (assignments || []).flatMap((assignment) => {
    const program = Array.isArray(assignment.program) ? assignment.program[0] : assignment.program;
    const profile = (profiles || []).find((item) => item.user_id === assignment.user_id);
    if (!program) return [];
    const relevant = (sessions || []).filter((session) => session.quiz_program_id === program.id && session.user_id === assignment.user_id && session.status === "submitted");
    const passed = relevant.filter((session) => session.passed === true);
    const scores = relevant.map((session) => Number(session.score_percent || 0));
    const status = calculateQuizProgramStatus({ completedQuizzes: passed.length, requiredQuizzes: program.required_quiz_count, dueAt: program.due_at });
    return [{
      learner_email: profile?.email || assignment.user_id,
      referee_level: profile?.referee_level || program.referee_level,
      discipline: program.discipline,
      program_id: program.id,
      program: program.title,
      quizzes_completed: passed.length,
      quizzes_attempted: relevant.length,
      quizzes_required: program.required_quiz_count,
      average_score: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0,
      latest_score: scores[0] ?? null,
      passed_quizzes: passed.length,
      start_date: program.start_at,
      due_date: program.due_at,
      status,
      last_activity: relevant[0]?.submitted_at || assignment.assigned_at,
    }];
  }).filter((row) =>
    (!params.get("program") || row.program_id === params.get("program")) &&
    (!params.get("discipline") || row.discipline === params.get("discipline")) &&
    (!params.get("refereeLevel") || row.referee_level === params.get("refereeLevel")) &&
    (!params.get("status") || row.status === params.get("status")) &&
    (!params.get("from") || Date.parse(row.last_activity) >= Date.parse(params.get("from")!)) &&
    (!params.get("to") || Date.parse(row.last_activity) <= Date.parse(params.get("to")!))
  );

  const metricMaps = new Map<MetricKey, Map<string, { correct: number; attempted: number }>>();
  for (const key of ["topic", "subtopic", "ruleId", "scenarioType", "refereeRole", "difficulty"] as MetricKey[]) metricMaps.set(key, new Map());
  const relevantSessionIds = new Set((sessions || []).filter((session) => rows.some((row) => row.program_id === session.quiz_program_id)).map((session) => session.id));
  for (const answer of answers || []) {
    const relation = Array.isArray(answer.question) ? answer.question[0] : answer.question;
    if (!relation || !relevantSessionIds.has(relation.quiz_session_id)) continue;
    const data = relation.question_data as Record<string, unknown>;
    for (const key of metricMaps.keys()) {
      const value = String(data[key] || "unclassified");
      const map = metricMaps.get(key)!;
      const current = map.get(value) || { correct: 0, attempted: 0 };
      current.attempted += 1;
      if (answer.correct) current.correct += 1;
      map.set(value, current);
    }
  }
  const topicPerformance = Object.fromEntries(Array.from(metricMaps.entries()).map(([key, map]) => [key, Array.from(map.entries()).map(([value, count]) => ({
    value, ...count, accuracy: count.attempted ? Math.round((count.correct / count.attempted) * 100) : 0,
  }))]));

  if (params.get("format") === "csv") {
    const columns = ["learner_email", "referee_level", "discipline", "program", "quizzes_attempted", "quizzes_completed", "quizzes_required", "average_score", "latest_score", "passed_quizzes", "start_date", "due_date", "status", "last_activity"] as const;
    const csv = [columns.join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))].join("\n");
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=quiz-program-report.csv" } });
  }
  return NextResponse.json({ rows, topicPerformance });
}
