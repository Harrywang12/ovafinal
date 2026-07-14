import type { SupabaseClient } from "@supabase/supabase-js";
import { getQuizAssignmentProgress, type QuizAssignmentProgress } from "./quiz-assignments";
import { calculateQuizProgramStatus, type QuizProgramStatus } from "./quiz-programs";

export type AssignedQuizSession = {
  id: string;
  status: string;
  scorePercent: number | null;
  passed: boolean;
  submittedAt: string | null;
  createdAt: string;
};

export type AssignedQuizProgram = {
  assignmentId: string;
  programId: string;
  title: string;
  discipline: "indoor" | "beach";
  refereeLevel: string;
  requiredPasses: number;
  passedQuizzes: number;
  attemptedQuizzes: number;
  remainingPasses: number;
  questionsPerQuiz: number;
  minimumScorePercent: number;
  startAt: string | null;
  dueAt: string | null;
  assignedAt: string;
  completedAt: string | null;
  status: QuizProgramStatus;
  sessions: AssignedQuizSession[];
};

export type AdaptiveAssignedWork = {
  assigned: boolean;
  questionQuota: number;
  requiredPercent: number;
  attempted: number;
  correct: number;
  scorePercent: number;
  remainingQuestions: number;
  passed: boolean;
  status: "not_assigned" | "in_progress" | "score_required" | "completed";
  assignedAt: string | null;
  completedAt: string | null;
};

export type AssignedWork = {
  adaptive: AdaptiveAssignedWork;
  programs: AssignedQuizProgram[];
  summary: {
    hasAssignments: boolean;
    hasOutstandingWork: boolean;
    outstandingCount: number;
    nextDueAt: string | null;
  };
};

type ProgramRow = {
  id: string;
  title: string;
  discipline: "indoor" | "beach";
  referee_level: string;
  required_quiz_count: number;
  questions_per_quiz: number;
  minimum_score_percent: number;
  start_at: string | null;
  due_at: string | null;
};

type AssignmentRow = {
  id: string;
  assigned_at: string;
  completed_at: string | null;
  program: ProgramRow | ProgramRow[] | null;
};

type SessionRow = {
  id: string;
  quiz_program_id: string;
  status: string;
  score_percent: number | null;
  passed: boolean | null;
  submitted_at: string | null;
  created_at: string;
};

export function toAdaptiveAssignedWork(progress: QuizAssignmentProgress): AdaptiveAssignedWork {
  const status: AdaptiveAssignedWork["status"] = !progress.assigned
    ? "not_assigned"
    : progress.passed
      ? "completed"
      : progress.remaining === 0
        ? "score_required"
        : "in_progress";

  return {
    assigned: progress.assigned,
    questionQuota: progress.question_quota,
    requiredPercent: progress.required_percent,
    attempted: progress.attempted,
    correct: progress.correct,
    scorePercent: progress.score_percent,
    remainingQuestions: progress.remaining,
    passed: progress.passed,
    status,
    assignedAt: progress.assigned_at,
    completedAt: progress.completed_at,
  };
}

export function summarizeAssignedWork(
  adaptive: AdaptiveAssignedWork,
  programs: AssignedQuizProgram[]
): AssignedWork["summary"] {
  const activePrograms = programs.filter((program) => program.status !== "completed");
  const adaptiveOutstanding = adaptive.assigned && !adaptive.passed
    ? Math.max(1, adaptive.remainingQuestions)
    : 0;
  const outstandingCount = adaptiveOutstanding
    + activePrograms.reduce((sum, program) => sum + program.remainingPasses, 0);
  const nextDueAt = activePrograms
    .map((program) => program.dueAt)
    .filter((value): value is string => !!value)
    .sort((a, b) => Date.parse(a) - Date.parse(b))[0] ?? null;

  return {
    hasAssignments: adaptive.assigned || programs.length > 0,
    hasOutstandingWork: outstandingCount > 0,
    outstandingCount,
    nextDueAt,
  };
}

export async function getAssignedWork(
  supabase: SupabaseClient,
  userId: string
): Promise<AssignedWork> {
  const [adaptiveProgress, assignmentsResult, sessionsResult] = await Promise.all([
    getQuizAssignmentProgress(supabase, userId),
    supabase
      .from("quiz_program_assignments")
      .select("id, assigned_at, completed_at, program:quiz_programs(id, title, discipline, referee_level, required_quiz_count, questions_per_quiz, minimum_score_percent, start_at, due_at)")
      .eq("user_id", userId)
      .order("assigned_at", { ascending: false }),
    supabase
      .from("quiz_sessions")
      .select("id, quiz_program_id, status, score_percent, passed, submitted_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  if (assignmentsResult.error) throw assignmentsResult.error;
  if (sessionsResult.error) throw sessionsResult.error;

  const sessionRows = (sessionsResult.data || []) as SessionRow[];
  const programs = ((assignmentsResult.data || []) as AssignmentRow[]).flatMap((assignment) => {
    const program = Array.isArray(assignment.program) ? assignment.program[0] : assignment.program;
    if (!program) return [];
    const relevant = sessionRows.filter((session) => session.quiz_program_id === program.id);
    const submitted = relevant.filter((session) => session.status === "submitted");
    const passedQuizzes = submitted.filter((session) => session.passed === true).length;
    const status = calculateQuizProgramStatus({
      completedQuizzes: passedQuizzes,
      requiredQuizzes: program.required_quiz_count,
      dueAt: program.due_at,
    });

    return [{
      assignmentId: assignment.id,
      programId: program.id,
      title: program.title,
      discipline: program.discipline,
      refereeLevel: program.referee_level,
      requiredPasses: program.required_quiz_count,
      passedQuizzes,
      attemptedQuizzes: submitted.length,
      remainingPasses: Math.max(0, program.required_quiz_count - passedQuizzes),
      questionsPerQuiz: program.questions_per_quiz,
      minimumScorePercent: program.minimum_score_percent,
      startAt: program.start_at,
      dueAt: program.due_at,
      assignedAt: assignment.assigned_at,
      completedAt: status === "completed" ? assignment.completed_at : null,
      status,
      sessions: relevant.map((session) => ({
        id: session.id,
        status: session.status,
        scorePercent: session.score_percent,
        passed: session.passed === true,
        submittedAt: session.submitted_at,
        createdAt: session.created_at,
      })),
    } satisfies AssignedQuizProgram];
  });

  const adaptive = toAdaptiveAssignedWork(adaptiveProgress);
  return { adaptive, programs, summary: summarizeAssignedWork(adaptive, programs) };
}
