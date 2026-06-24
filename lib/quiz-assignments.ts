import type { SupabaseClient } from "@supabase/supabase-js";

export type QuizAssignmentRow = {
  user_id: string;
  question_quota: number;
  required_percent: number;
  assigned_at: string;
  completed_at: string | null;
};

export type QuizAssignmentProgress = {
  assigned: boolean;
  question_quota: number;
  required_percent: number;
  attempted: number;
  correct: number;
  score_percent: number;
  remaining: number;
  passed: boolean;
  completed_at: string | null;
  assigned_at: string | null;
};

export function emptyQuizAssignmentProgress(): QuizAssignmentProgress {
  return {
    assigned: false,
    question_quota: 0,
    required_percent: 0,
    attempted: 0,
    correct: 0,
    score_percent: 0,
    remaining: 0,
    passed: false,
    completed_at: null,
    assigned_at: null,
  };
}

export async function getQuizAssignmentProgress(
  supabase: SupabaseClient,
  userId: string
): Promise<QuizAssignmentProgress> {
  const { data: assignment, error: assignmentError } = await supabase
    .from("quiz_assignments")
    .select("user_id, question_quota, required_percent, assigned_at, completed_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (assignmentError) throw assignmentError;
  if (!assignment) return emptyQuizAssignmentProgress();

  const row = assignment as QuizAssignmentRow;
  const { data: attempts, error: attemptsError } = await supabase
    .from("quiz_attempts")
    .select("correct")
    .eq("user_id", userId)
    .gte("created_at", row.assigned_at);

  if (attemptsError) throw attemptsError;

  const attempted = attempts?.length || 0;
  const correct = (attempts || []).filter((attempt) => attempt.correct === true).length;
  const scorePercent = attempted ? Math.round((correct / attempted) * 100) : 0;
  const passed = attempted >= row.question_quota && scorePercent >= row.required_percent;

  return {
    assigned: true,
    question_quota: row.question_quota,
    required_percent: row.required_percent,
    attempted,
    correct,
    score_percent: scorePercent,
    remaining: Math.max(0, row.question_quota - attempted),
    passed,
    completed_at: row.completed_at,
    assigned_at: row.assigned_at,
  };
}

export async function markQuizAssignmentCompleteIfPassed(
  supabase: SupabaseClient,
  userId: string
): Promise<QuizAssignmentProgress> {
  const progress = await getQuizAssignmentProgress(supabase, userId);
  if (!progress.assigned || !progress.passed || progress.completed_at) {
    return progress;
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("quiz_assignments")
    .update({ completed_at: now })
    .eq("user_id", userId);

  if (error) throw error;
  return { ...progress, completed_at: now };
}
