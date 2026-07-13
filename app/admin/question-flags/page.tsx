"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Flag, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AuthGuard } from "../../../components/auth-guard";
import { useAdminAccess } from "../../../lib/useAdminAccess";
import { useSupabaseAuth } from "../../../lib/useSupabaseAuth";

type FlagRow = {
  id: string; reason: string; comment: string | null; status: string; created_at: string; review_notes: string | null;
  profile: { email: string | null; referee_level: string } | null;
  session_question: { question_data: Record<string, unknown> } | null;
  generated_question: { question_data: Record<string, unknown> } | null;
};

export default function QuestionFlagsAdminPage() {
  const { session } = useSupabaseAuth();
  const access = useAdminAccess(session);
  const token = session?.access_token || "";
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const query = useQuery<{ flags: FlagRow[] }>({
    queryKey: ["admin", "question-flags", reason], enabled: !!token && access.data?.isAdmin,
    queryFn: async () => read(await fetch(`/api/admin/question-flags${reason ? `?reason=${reason}` : ""}`, { headers: { Authorization: `Bearer ${token}` } })),
  });
  const review = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "resolved" | "dismissed" }) => read(await fetch(`/api/admin/question-flags/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status, reviewNotes: notes[id] || "" }),
    })),
    onSuccess: () => query.refetch(),
  });
  return <AuthGuard><main className="admin-shell min-h-screen pt-24 pb-20"><div className="mx-auto max-w-6xl px-4 sm:px-6">
    <Link href="/admin" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-primary"><ArrowLeft size={16} /> Admin overview</Link>
    {!access.data?.isAdmin ? <div className="admin-surface p-8 text-center text-muted">Admin access required.</div> : <>
      <header className="mb-6 border-b border-border pb-6"><div className="flex items-center gap-2 text-accent"><Flag size={20} /><span className="text-xs font-bold uppercase tracking-[0.16em]">Quality review</span></div><h1 className="mt-2 text-4xl font-display font-bold text-primary">Question reports</h1><p className="mt-2 text-muted">Review generated content and its source evidence without creating a reusable question bank.</p></header>
      <div className="mb-5 max-w-xs"><label className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Reason filter</label><select value={reason} onChange={(e) => setReason(e.target.value)} className="admin-input mt-1.5"><option value="">All reasons</option>{["incorrect_answer", "ambiguous_wording", "incorrect_rule_reference", "outside_referee_level", "duplicate_question", "technical_issue", "other"].map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></div>
      {query.isLoading ? <p className="inline-flex items-center gap-2 text-muted"><Loader2 size={17} className="animate-spin" /> Loading reports</p> : query.data?.flags.length ? <div className="space-y-4">{query.data.flags.map((item) => {
        const relation = Array.isArray(item.session_question) ? item.session_question[0] : item.session_question;
        const generatedRelation = Array.isArray(item.generated_question) ? item.generated_question[0] : item.generated_question;
        const question = relation?.question_data || generatedRelation?.question_data || {};
        return <article key={item.id} className="admin-surface p-5 md:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-red-700">{item.reason.replaceAll("_", " ")}</p><p className="mt-1 text-sm text-muted">{item.profile?.email || "Unknown learner"} · {new Date(item.created_at).toLocaleString()}</p></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold capitalize text-primary">{item.status}</span></div>
          <h2 className="mt-5 text-lg font-bold text-primary">{String(question.question || "Question unavailable")}</h2><ol className="mt-3 grid gap-2 text-sm">{Array.isArray(question.options) && question.options.map((option: unknown, index: number) => <li key={String(option)}><strong>{String.fromCharCode(65 + index)}.</strong> {String(option)}</li>)}</ol>
          <div className="mt-4 grid gap-4 border-t border-border pt-4 md:grid-cols-2"><div><p className="text-xs font-bold uppercase text-muted">Correct answer</p><p className="mt-1 text-sm">{String(question.answer || "-")}</p><p className="mt-3 text-xs font-bold uppercase text-muted">Explanation</p><p className="mt-1 text-sm leading-6">{String(question.explanation || "-")}</p></div><div><p className="text-xs font-bold uppercase text-muted">Rule and source</p><p className="mt-1 text-sm font-semibold">{String(question.ruleReference || "-")}</p><p className="mt-2 text-sm leading-6 text-muted">{String(question.sourceExcerpt || "-")}</p><p className="mt-3 text-xs text-muted">{String(question.discipline || "-")} · {String(question.refereeLevel || "-")} · {String(question.topic || "-")} · {String(question.refereeRole || "-")}</p></div></div>
          {item.comment && <p className="mt-4 border-l-2 border-accent pl-3 text-sm"><strong>Learner comment:</strong> {item.comment}</p>}
          {item.status === "open" && <div className="mt-5"><textarea value={notes[item.id] || ""} onChange={(e) => setNotes((current) => ({ ...current, [item.id]: e.target.value }))} placeholder="Internal review notes" className="admin-input min-h-20" /><div className="mt-2 flex gap-2"><button type="button" onClick={() => review.mutate({ id: item.id, status: "resolved" })} className="admin-primary-button"><CheckCircle2 size={16} /> Resolve</button><button type="button" onClick={() => review.mutate({ id: item.id, status: "dismissed" })} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 text-sm font-bold text-primary"><XCircle size={16} /> Dismiss</button></div></div>}
        </article>;
      })}</div> : <p className="border-t border-border py-10 text-muted">No question reports match this filter.</p>}
    </>}
  </div></main></AuthGuard>;
}
async function read(response: Response) { const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || "Request failed"); return data; }
