"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Loader2, Sparkles, Target, Trophy, Waves, XCircle, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AuthGuard } from "../../components/auth-guard";
import { QuizQuestionReport } from "../../components/quiz-question-report";
import { useSupabaseAuth } from "../../lib/useSupabaseAuth";
import type { AssignedWork } from "../../lib/assigned-work";
import { AssignedWorkPanel } from "../../components/assigned-work-panel";

type Discipline = "indoor" | "beach";
type Question = {
  id: string;
  sequenceNumber?: number;
  question: string;
  options: [string, string, string, string];
  ruleReference: string;
  sourceExcerpt?: string;
  discipline: Discipline;
  refereeLevel: string;
  difficulty: string;
  topic: string;
  sourceDocumentId: string;
  adaptive_difficulty?: "easy" | "medium" | "hard";
  difficulty_label?: string;
};
type Feedback = { correct: boolean; answer: string; explanation: string; ruleReference: string; sourceExcerpt: string; sourceTitle?: string };
type ProgramAssignment = {
  id: string;
  status: "not_started" | "in_progress" | "completed" | "overdue";
  completedQuizzes: number;
  attemptedQuizzes: number;
  program: {
    id: string; title: string; discipline: Discipline; referee_level: string; required_quiz_count: number;
    questions_per_quiz: number; minimum_score_percent: number; start_at: string | null; due_at: string | null;
  };
  sessions: Array<{ id: string; status: string; score_percent: number | null; passed: boolean | null }>;
};
type SessionResult = {
  scorePercent: number; correctCount: number; questionCount: number; passed: boolean;
  answers: Array<Feedback & { questionId: string; selectedAnswer: string }>;
};

async function responseData(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || "Request failed");
  return data;
}

export default function QuizPage() {
  const { session } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const token = session?.access_token || "";
  const [mode, setMode] = useState<"practice" | "assigned">("practice");
  const [discipline, setDiscipline] = useState<Discipline>("indoor");
  const [practiceQuestion, setPracticeQuestion] = useState<Question | null>(null);
  const [practiceSelection, setPracticeSelection] = useState("");
  const [practiceFeedback, setPracticeFeedback] = useState<Feedback | null>(null);
  const [activeSession, setActiveSession] = useState<{ id: string; title: string; questions: Question[] } | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [sessionAnswers, setSessionAnswers] = useState<Record<string, string>>({});
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const selectedInitialMode = useRef(false);

  const assignedWorkQuery = useQuery<AssignedWork>({
    queryKey: ["assigned-work"],
    queryFn: async () => responseData(await fetch("/api/assigned-work")),
  });

  useEffect(() => {
    if (selectedInitialMode.current || !assignedWorkQuery.data) return;
    selectedInitialMode.current = true;
    if (assignedWorkQuery.data.summary.hasOutstandingWork) setMode("assigned");
  }, [assignedWorkQuery.data]);

  const programsQuery = useQuery<{ assignments: ProgramAssignment[] }>({
    queryKey: ["quiz-program-assignments"],
    enabled: !!token,
    queryFn: async () => responseData(await fetch("/api/quiz-programs", { headers: { Authorization: `Bearer ${token}` } })),
  });

  const generatePractice = useMutation({
    mutationFn: async () => responseData(await fetch("/api/generate-question", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ discipline }),
    })),
    onSuccess: (question: Question) => {
      setPracticeQuestion(question); setPracticeSelection(""); setPracticeFeedback(null);
    },
  });

  const submitPractice = useMutation({
    mutationFn: async () => responseData(await fetch("/api/quiz-attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ question_id: practiceQuestion?.id, selected_option: practiceSelection }),
    })),
    onSuccess: (feedback: Feedback) => {
      setPracticeFeedback(feedback);
      queryClient.invalidateQueries({ queryKey: ["quiz-adaptive-state"] });
      queryClient.invalidateQueries({ queryKey: ["assigned-work"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const loadSession = async (id: string, fallbackTitle: string) => {
    const data = await responseData(await fetch(`/api/quiz-sessions/${id}`, { headers: { Authorization: `Bearer ${token}` } }));
    setActiveSession({ id, title: data.session?.title || fallbackTitle, questions: data.questions });
    setQuestionIndex(0); setSessionAnswers({}); setSessionResult(null);
  };

  const startSession = useMutation({
    mutationFn: async (assignment: ProgramAssignment) => {
      const data = await responseData(await fetch("/api/quiz-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ assignmentId: assignment.id }),
      }));
      if (data.questions) return { id: data.session.id, title: assignment.program.title, questions: data.questions as Question[] };
      const existing = await responseData(await fetch(`/api/quiz-sessions/${data.sessionId}`, { headers: { Authorization: `Bearer ${token}` } }));
      return { id: data.sessionId, title: assignment.program.title, questions: existing.questions as Question[] };
    },
    onSuccess: (value) => { setActiveSession(value); setQuestionIndex(0); setSessionAnswers({}); setSessionResult(null); },
  });

  const submitSession = useMutation({
    mutationFn: async () => responseData(await fetch(`/api/quiz-sessions/${activeSession?.id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ answers: activeSession?.questions.map((question) => ({ questionId: question.id, selectedAnswer: sessionAnswers[question.id] })) }),
    })),
    onSuccess: (result: SessionResult) => {
      setSessionResult(result);
      queryClient.invalidateQueries({ queryKey: ["quiz-program-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["assigned-work"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const currentSessionQuestion = activeSession?.questions[questionIndex];
  const sessionFeedback = useMemo(() => sessionResult?.answers.find((item) => item.questionId === currentSessionQuestion?.id), [currentSessionQuestion?.id, sessionResult]);
  const allAnswered = !!activeSession && activeSession.questions.every((question) => !!sessionAnswers[question.id]);

  return (
    <AuthGuard>
      <main className="min-h-screen pt-24 pb-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <header className="mb-8 border-b border-border pb-7">
            <div className="flex items-center gap-3 text-accent"><Sparkles size={24} /><span className="text-xs font-bold uppercase tracking-[0.16em]">Official rules assessment</span></div>
            <h1 className="mt-3 text-4xl font-display font-bold text-primary md:text-5xl">Referee quizzes</h1>
            <p className="mt-3 max-w-2xl text-muted">Choose a discipline for adaptive practice or complete a frozen, assigned quiz program.</p>
          </header>

          {assignedWorkQuery.data ? <div className="mb-8"><AssignedWorkPanel work={assignedWorkQuery.data} compact /></div> : null}

          <div className="mb-8 inline-flex rounded-lg border border-border bg-white p-1">
            {(["practice", "assigned"] as const).map((item) => (
              <button key={item} type="button" onClick={() => setMode(item)} className={`rounded-md px-4 py-2 text-sm font-bold capitalize ${mode === item ? "bg-primary text-white" : "text-muted hover:text-primary"}`}>
                {item === "practice" ? "Adaptive practice" : "Assigned programs"}
              </button>
            ))}
          </div>

          {mode === "practice" ? (
            <section>
              <div className="mb-7 flex flex-col gap-4 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Discipline</label>
                  <div className="mt-2 inline-flex rounded-lg border border-border bg-white p-1">
                    <button type="button" disabled={generatePractice.isPending} onClick={() => setDiscipline("indoor")} className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold ${discipline === "indoor" ? "bg-secondary text-white" : "text-muted"}`}><Target size={16} /> Indoor</button>
                    <button type="button" disabled={generatePractice.isPending} onClick={() => setDiscipline("beach")} className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold ${discipline === "beach" ? "bg-secondary text-white" : "text-muted"}`}><Waves size={16} /> Beach</button>
                  </div>
                </div>
                <button type="button" onClick={() => generatePractice.mutate()} disabled={generatePractice.isPending} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-white disabled:opacity-50">
                  {generatePractice.isPending ? <Loader2 size={17} className="animate-spin" /> : <Zap size={17} />} {practiceQuestion ? "Generate another" : "Generate question"}
                </button>
              </div>
              {generatePractice.isError && <ErrorMessage error={generatePractice.error as Error} />}
              {practiceQuestion && (
                <QuestionPanel question={practiceQuestion} selected={practiceSelection} onSelect={setPracticeSelection} locked={!!practiceFeedback} feedback={practiceFeedback}>
                  {!practiceFeedback ? (
                    <button type="button" onClick={() => submitPractice.mutate()} disabled={!practiceSelection || submitPractice.isPending} className="rounded-lg bg-accent px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
                      {submitPractice.isPending ? "Checking..." : "Submit answer"}
                    </button>
                  ) : <QuizQuestionReport accessToken={token} generatedQuizQuestionId={practiceQuestion.id} />}
                </QuestionPanel>
              )}
            </section>
          ) : activeSession ? (
            <section>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
                <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{activeSession.title}</p><h2 className="mt-1 text-2xl font-display font-bold text-primary">Question {questionIndex + 1} of {activeSession.questions.length}</h2></div>
                <button type="button" onClick={() => setActiveSession(null)} className="text-sm font-bold text-muted hover:text-primary">Exit session</button>
              </div>
              {sessionResult && <div className={`mb-6 border-l-4 p-4 ${sessionResult.passed ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}`}><p className="text-2xl font-display font-bold text-primary">{sessionResult.scorePercent}% · {sessionResult.passed ? "Passed" : "Not passed"}</p><p className="mt-1 text-sm text-muted">{sessionResult.correctCount} of {sessionResult.questionCount} correct</p></div>}
              {currentSessionQuestion && (
                <QuestionPanel question={currentSessionQuestion} selected={sessionAnswers[currentSessionQuestion.id] || ""} onSelect={(answer) => setSessionAnswers((current) => ({ ...current, [currentSessionQuestion.id]: answer }))} locked={!!sessionResult} feedback={sessionFeedback || null}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button type="button" onClick={() => setQuestionIndex((index) => Math.max(0, index - 1))} disabled={questionIndex === 0} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-bold text-primary disabled:opacity-40"><ArrowLeft size={16} /> Previous</button>
                    {sessionResult && <QuizQuestionReport accessToken={token} quizSessionQuestionId={currentSessionQuestion.id} />}
                    {questionIndex < activeSession.questions.length - 1 ? (
                      <button type="button" onClick={() => setQuestionIndex((index) => index + 1)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white">Next <ArrowRight size={16} /></button>
                    ) : !sessionResult ? (
                      <button type="button" onClick={() => submitSession.mutate()} disabled={!allAnswered || submitSession.isPending} className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2 text-sm font-bold text-white disabled:opacity-50"><Trophy size={16} /> Submit quiz</button>
                    ) : null}
                  </div>
                  {submitSession.isError && <ErrorMessage error={submitSession.error as Error} />}
                </QuestionPanel>
              )}
            </section>
          ) : (
            <section>
              <div className="mb-5"><h2 className="text-2xl font-display font-bold text-primary">Your programs</h2><p className="mt-1 text-sm text-muted">Discipline and referee level are fixed by the assignment.</p></div>
              {programsQuery.isLoading ? <LoadingLabel label="Loading assigned programs" /> : programsQuery.isError ? <ErrorMessage error={programsQuery.error as Error} /> : (programsQuery.data?.assignments.length || 0) === 0 ? <p className="border-t border-border py-8 text-muted">No quiz programs are assigned.</p> : (
                <div className="divide-y divide-border border-y border-border">
                  {programsQuery.data?.assignments.map((assignment) => {
                    const ready = assignment.sessions.find((item) => ["ready", "in_progress"].includes(item.status));
                    const disabled = assignment.status === "completed" || assignment.status === "overdue";
                    return <div key={assignment.id} className="grid gap-4 py-5 md:grid-cols-[1fr_auto] md:items-center">
                      <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-bold text-primary">{assignment.program.title}</h3><StatusBadge value={assignment.status} /></div><p className="mt-2 text-sm text-muted capitalize">{assignment.program.discipline} · {assignment.program.referee_level.replace("_", " ")} · {assignment.program.questions_per_quiz} questions · pass at {assignment.program.minimum_score_percent}%</p><p className="mt-1 text-sm font-semibold text-primary">{assignment.completedQuizzes}/{assignment.program.required_quiz_count} passing quizzes complete · {assignment.attemptedQuizzes} attempt(s){assignment.program.due_at ? ` · Due ${new Date(assignment.program.due_at).toLocaleDateString()}` : ""}</p></div>
                      <button type="button" disabled={disabled || startSession.isPending} onClick={() => ready ? loadSession(ready.id, assignment.program.title) : startSession.mutate(assignment)} className="h-10 rounded-lg bg-primary px-4 text-sm font-bold text-white disabled:opacity-40">{ready ? "Resume quiz" : "Start next quiz"}</button>
                    </div>;
                  })}
                </div>
              )}
              {startSession.isPending && <LoadingLabel label="Generating and validating the complete quiz" />}
              {startSession.isError && <ErrorMessage error={startSession.error as Error} />}
            </section>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}

function QuestionPanel({ question, selected, onSelect, locked, feedback, children }: { question: Question; selected: string; onSelect: (value: string) => void; locked: boolean; feedback: Feedback | null; children: React.ReactNode }) {
  return <div>
    <div className="mb-4 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted"><span>{question.discipline}</span><span>·</span><span>{question.difficulty}</span><span>·</span><span>{question.topic.replaceAll("_", " ")}</span></div>
    <h2 className="max-w-3xl text-xl font-display font-bold leading-8 text-primary md:text-2xl">{question.question}</h2>
    <div className="mt-6 grid gap-3">
      {question.options.map((option, index) => {
        const isCorrect = feedback?.answer === option;
        const isWrong = !!feedback && selected === option && !feedback.correct;
        return <button key={option} type="button" disabled={locked} onClick={() => onSelect(option)} className={`grid min-h-14 grid-cols-[2rem_1fr] items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-semibold transition ${isCorrect ? "border-green-500 bg-green-50 text-green-900" : isWrong ? "border-red-400 bg-red-50 text-red-900" : selected === option ? "border-primary bg-primary/5 text-primary" : "border-border bg-white text-ink hover:border-primary/40"}`}><span className="flex h-8 w-8 items-center justify-center rounded-full border border-current text-xs">{String.fromCharCode(65 + index)}</span><span>{option}</span></button>;
      })}
    </div>
    {feedback && <div className={`mt-5 border-l-4 p-4 ${feedback.correct ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}`}><div className="flex items-center gap-2 font-bold text-primary">{feedback.correct ? <CheckCircle2 size={18} /> : <XCircle size={18} />}{feedback.correct ? "Correct" : "Incorrect"}</div><p className="mt-2 text-sm leading-6 text-ink">{feedback.explanation}</p><div className="mt-3 flex items-start gap-2 text-sm text-muted"><BookOpen size={16} className="mt-0.5 shrink-0" /><span><strong>{feedback.ruleReference}</strong>{feedback.sourceTitle ? ` · ${feedback.sourceTitle}` : ""}<br />{feedback.sourceExcerpt}</span></div></div>}
    <div className="mt-6">{children}</div>
  </div>;
}

function StatusBadge({ value }: { value: ProgramAssignment["status"] }) {
  const style = value === "completed" ? "bg-green-100 text-green-800" : value === "overdue" ? "bg-red-100 text-red-800" : "bg-primary/10 text-primary";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${style}`}>{value.replace("_", " ")}</span>;
}
function ErrorMessage({ error }: { error: Error }) { return <p className="mt-4 border-l-4 border-red-500 bg-red-50 p-3 text-sm font-semibold text-red-700">{error.message}</p>; }
function LoadingLabel({ label }: { label: string }) { return <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-muted"><Loader2 size={16} className="animate-spin" />{label}</p>; }
