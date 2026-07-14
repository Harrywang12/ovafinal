"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Archive, ArrowLeft, Check, ClipboardList, Download, Loader2, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AuthGuard } from "../../../components/auth-guard";
import { DEFAULT_DIFFICULTY_PROGRESSION, DEFAULT_TOPIC_BLUEPRINTS, type QuizDiscipline } from "../../../lib/quiz-programs";
import { useAdminAccess } from "../../../lib/useAdminAccess";
import { useSupabaseAuth } from "../../../lib/useSupabaseAuth";

type Program = {
  id: string; title: string; discipline: QuizDiscipline; referee_level: "level_1" | "level_2" | "level_3" | "level_4";
  required_quiz_count: number; questions_per_quiz: number; minimum_score_percent: number;
  start_at: string | null; due_at: string | null; topic_blueprint: unknown; difficulty_progression: unknown; archived_at: string | null;
};
type Learner = { user_id: string; email: string | null; referee_level: string };
type Assignment = {
  id: string; quiz_program_id: string; user_id: string; assigned_at: string; completed_quizzes: number; attempted_quizzes: number;
  average_score: number; latest_score: number | null; passed_quizzes: number; last_activity: string; status: string;
};

const toLocalInput = (value: string | null) => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
const toIso = (value: string) => value ? new Date(value).toISOString() : null;

export default function QuizProgramsAdminPage() {
  const { session } = useSupabaseAuth();
  const access = useAdminAccess(session);
  const token = session?.access_token || "";
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [discipline, setDiscipline] = useState<QuizDiscipline>("beach");
  const [level, setLevel] = useState<Program["referee_level"]>("level_1");
  const [requiredCount, setRequiredCount] = useState(1);
  const [questionCount, setQuestionCount] = useState(10);
  const [minimumScore, setMinimumScore] = useState(70);
  const [startAt, setStartAt] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [blueprint, setBlueprint] = useState(JSON.stringify(DEFAULT_TOPIC_BLUEPRINTS.beach.level_1, null, 2));
  const [progression, setProgression] = useState(JSON.stringify(DEFAULT_DIFFICULTY_PROGRESSION, null, 2));
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userFilter, setUserFilter] = useState("");

  const authHeaders = { Authorization: `Bearer ${token}` };
  const programs = useQuery<{ programs: Program[] }>({
    queryKey: ["admin", "quiz-programs"], enabled: !!token && access.data?.isAdmin,
    queryFn: async () => read(await fetch("/api/admin/quiz-programs", { headers: authHeaders })),
  });
  const assignments = useQuery<{ learners: Learner[]; assignments: Assignment[] }>({
    queryKey: ["admin", "quiz-program-assignments"], enabled: !!token && access.data?.isAdmin,
    queryFn: async () => read(await fetch("/api/admin/quiz-program-assignments", { headers: authHeaders })),
  });

  const resetForm = (nextDiscipline: QuizDiscipline = discipline, nextLevel: Program["referee_level"] = level) => {
    setEditingId(null); setTitle(""); setRequiredCount(1); setQuestionCount(10); setMinimumScore(70); setStartAt(""); setDueAt("");
    const supportedLevel = nextLevel === "level_2" ? "level_2" : "level_1";
    setBlueprint(JSON.stringify(DEFAULT_TOPIC_BLUEPRINTS[nextDiscipline][supportedLevel], null, 2));
    setProgression(JSON.stringify(DEFAULT_DIFFICULTY_PROGRESSION, null, 2));
  };
  const formPayload = () => ({
    title, discipline, refereeLevel: level, requiredQuizCount: requiredCount, questionsPerQuiz: questionCount,
    minimumScorePercent: minimumScore, startAt: toIso(startAt), dueAt: toIso(dueAt),
    topicBlueprint: JSON.parse(blueprint), difficultyProgression: JSON.parse(progression),
  });
  const save = useMutation({
    mutationFn: async () => read(await fetch(editingId ? `/api/admin/quiz-programs/${editingId}` : "/api/admin/quiz-programs", {
      method: editingId ? "PATCH" : "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" }, body: JSON.stringify(formPayload()),
    })),
    onSuccess: () => { programs.refetch(); resetForm(); },
  });
  const archive = useMutation({
    mutationFn: async (id: string) => read(await fetch(`/api/admin/quiz-programs/${id}`, { method: "DELETE", headers: authHeaders })),
    onSuccess: () => programs.refetch(),
  });
  const assign = useMutation({
    mutationFn: async (action: "assign" | "remove") => read(await fetch("/api/admin/quiz-program-assignments", {
      method: "POST", headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ action, programId: selectedProgramId, userIds: selectedUsers }),
    })),
    onSuccess: () => { setSelectedUsers([]); assignments.refetch(); },
  });
  const exportReport = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/quiz-program-reports?format=csv", { headers: authHeaders });
      if (!response.ok) throw new Error("Failed to export report");
      return response.blob();
    },
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = "quiz-program-report.csv"; anchor.click();
      URL.revokeObjectURL(url);
    },
  });

  const edit = (program: Program) => {
    setEditingId(program.id); setTitle(program.title); setDiscipline(program.discipline); setLevel(program.referee_level);
    setRequiredCount(program.required_quiz_count); setQuestionCount(program.questions_per_quiz); setMinimumScore(program.minimum_score_percent);
    setStartAt(toLocalInput(program.start_at)); setDueAt(toLocalInput(program.due_at));
    setBlueprint(JSON.stringify(program.topic_blueprint, null, 2)); setProgression(JSON.stringify(program.difficulty_progression, null, 2));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const filteredLearners = useMemo(() => (assignments.data?.learners || []).filter((learner) =>
    !userFilter || learner.email?.toLowerCase().includes(userFilter.toLowerCase())
  ), [assignments.data?.learners, userFilter]);

  return <AuthGuard><main className="admin-shell min-h-screen pt-24 pb-20"><div className="mx-auto max-w-7xl px-4 sm:px-6">
    <Link href="/admin" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-primary"><ArrowLeft size={16} /> Admin overview</Link>
    {!access.data?.isAdmin ? <div className="admin-surface p-8 text-center text-muted">Admin access required.</div> : <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6"><div><div className="flex items-center gap-2 text-accent"><ClipboardList size={20} /><span className="text-xs font-bold uppercase tracking-[0.16em]">Assessment operations</span></div><h1 className="mt-2 text-4xl font-display font-bold text-primary">Quiz programs</h1><p className="mt-2 text-muted">Configure complete, source-grounded quiz assignments and monitor delivery.</p></div><button type="button" onClick={() => exportReport.mutate()} className="admin-primary-button"><Download size={17} /> Export CSV</button></header>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="admin-surface p-5 md:p-7"><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-display font-bold text-primary">{editingId ? "Edit program" : "New program"}</h2>{editingId && <button type="button" onClick={() => resetForm()} className="text-sm font-bold text-muted">Cancel edit</button>}</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" wide><input value={title} onChange={(e) => setTitle(e.target.value)} className="admin-input" /></Field>
            <Field label="Discipline"><select value={discipline} onChange={(e) => { const value = e.target.value as QuizDiscipline; setDiscipline(value); const supported = level === "level_2" ? "level_2" : "level_1"; setBlueprint(JSON.stringify(DEFAULT_TOPIC_BLUEPRINTS[value][supported], null, 2)); }} className="admin-input"><option value="indoor">Indoor</option><option value="beach">Beach</option></select></Field>
            <Field label="Referee level"><select value={level} onChange={(e) => { const value = e.target.value as Program["referee_level"]; setLevel(value); const supported = value === "level_2" ? "level_2" : "level_1"; setBlueprint(JSON.stringify(DEFAULT_TOPIC_BLUEPRINTS[discipline][supported], null, 2)); }} className="admin-input">{[1,2,3,4].map((item) => <option key={item} value={`level_${item}`}>Level {item}</option>)}</select></Field>
            <Field label="Required quizzes"><input type="number" min={1} value={requiredCount} onChange={(e) => setRequiredCount(Number(e.target.value))} className="admin-input" /></Field>
            <Field label="Questions per quiz"><input type="number" min={1} max={30} value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} className="admin-input" /></Field>
            <Field label="Pass percentage"><input type="number" min={0} max={100} value={minimumScore} onChange={(e) => setMinimumScore(Number(e.target.value))} className="admin-input" /></Field>
            <Field label="Start date"><input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="admin-input" /></Field>
            <Field label="Due date"><input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="admin-input" /></Field>
            <Field label="Topic blueprint JSON" wide><textarea value={blueprint} onChange={(e) => setBlueprint(e.target.value)} className="admin-input min-h-48 font-mono text-xs" /></Field>
            <Field label="Difficulty progression JSON" wide><textarea value={progression} onChange={(e) => setProgression(e.target.value)} className="admin-input min-h-40 font-mono text-xs" /></Field>
          </div>
          <button type="button" onClick={() => save.mutate()} disabled={!title.trim() || save.isPending} className="admin-primary-button mt-5">{save.isPending ? <Loader2 size={17} className="animate-spin" /> : editingId ? <Check size={17} /> : <Plus size={17} />}{editingId ? "Save changes" : "Create program"}</button>
          {save.isError && <ErrorText error={save.error as Error} />}
        </section>

        <section className="space-y-6"><div className="admin-surface p-5 md:p-7"><h2 className="text-xl font-display font-bold text-primary">Programs</h2><div className="mt-4 divide-y divide-border border-y border-border">{programs.isLoading ? <p className="py-6 text-muted">Loading programs...</p> : programs.data?.programs.map((program) => <div key={program.id} className="py-4"><div className="flex items-start justify-between gap-4"><div><p className="font-bold text-primary">{program.title}</p><p className="mt-1 text-xs capitalize text-muted">{program.discipline} · {program.referee_level.replace("_", " ")} · {program.questions_per_quiz} questions · {program.required_quiz_count} required</p></div><span className={`rounded-full px-2 py-1 text-xs font-bold ${program.archived_at ? "bg-border text-muted" : "bg-green-100 text-green-800"}`}>{program.archived_at ? "Archived" : "Active"}</span></div><div className="mt-3 flex gap-3"><button type="button" onClick={() => edit(program)} className="text-sm font-bold text-primary">Edit</button>{!program.archived_at && <button type="button" onClick={() => archive.mutate(program.id)} className="inline-flex items-center gap-1 text-sm font-bold text-red-700"><Archive size={14} /> Archive</button>}</div></div>)}</div></div>
          <div className="admin-surface p-5 md:p-7"><div className="flex items-center gap-2"><Users size={20} className="text-accent" /><h2 className="text-xl font-display font-bold text-primary">Assignments</h2></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2"><select value={selectedProgramId} onChange={(e) => setSelectedProgramId(e.target.value)} className="admin-input"><option value="">Select program</option>{programs.data?.programs.filter((item) => !item.archived_at).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><input value={userFilter} onChange={(e) => setUserFilter(e.target.value)} placeholder="Search learner email" className="admin-input" /></div>
            <div className="mt-3 max-h-48 overflow-auto border-y border-border">{filteredLearners.map((learner) => <label key={learner.user_id} className="flex items-center gap-3 border-b border-border/60 py-2 text-sm"><input type="checkbox" checked={selectedUsers.includes(learner.user_id)} onChange={() => setSelectedUsers((current) => current.includes(learner.user_id) ? current.filter((id) => id !== learner.user_id) : [...current, learner.user_id])} /><span className="min-w-0 flex-1 truncate">{learner.email || learner.user_id}</span><span className="text-xs text-muted">{learner.referee_level.replace("_", " ")}</span></label>)}</div>
            <div className="mt-3 flex gap-2"><button type="button" onClick={() => assign.mutate("assign")} disabled={!selectedProgramId || !selectedUsers.length} className="admin-primary-button">Assign selected</button><button type="button" onClick={() => assign.mutate("remove")} disabled={!selectedProgramId || !selectedUsers.length} className="rounded-lg border border-border px-4 text-sm font-bold text-primary disabled:opacity-40">Remove</button></div>
            {assignments.data?.assignments.length ? <div className="mt-6 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="text-xs uppercase text-muted"><tr><th className="pb-2 pr-3">Learner</th><th className="pb-2 pr-3">Progress</th><th className="pb-2 pr-3">Score</th><th className="pb-2">Status</th></tr></thead><tbody>{assignments.data.assignments.filter((item) => !selectedProgramId || item.quiz_program_id === selectedProgramId).map((item) => <tr key={item.id} className="border-t border-border"><td className="py-3 pr-3">{assignments.data?.learners.find((learner) => learner.user_id === item.user_id)?.email || item.user_id}</td><td className="py-3 pr-3">{item.completed_quizzes} passed · {item.attempted_quizzes} attempted</td><td className="py-3 pr-3">{item.latest_score ?? "-"}% avg {item.average_score}%</td><td className="py-3 capitalize">{item.status.replace("_", " ")}</td></tr>)}</tbody></table></div> : null}
          </div>
        </section>
      </div>
    </>}
  </div></main></AuthGuard>;
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) { return <label className={wide ? "sm:col-span-2" : ""}><span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</span>{children}</label>; }
async function read(response: Response) { const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || "Request failed"); return data; }
function ErrorText({ error }: { error: Error }) { return <p className="mt-3 text-sm font-semibold text-red-700">{error.message}</p>; }
