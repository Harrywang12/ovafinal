"use client";

import { useMutation } from "@tanstack/react-query";
import { Flag, Loader2, X } from "lucide-react";
import { useState } from "react";

const reasons = [
  ["incorrect_answer", "Incorrect answer"],
  ["ambiguous_wording", "Ambiguous wording"],
  ["incorrect_rule_reference", "Incorrect rule reference"],
  ["outside_referee_level", "Outside referee level"],
  ["duplicate_question", "Duplicate question"],
  ["technical_issue", "Technical issue"],
  ["other", "Other"],
] as const;

export function QuizQuestionReport({
  accessToken,
  generatedQuizQuestionId,
  quizSessionQuestionId,
}: {
  accessToken: string;
  generatedQuizQuestionId?: string;
  quizSessionQuestionId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof reasons)[number][0]>("incorrect_answer");
  const [comment, setComment] = useState("");
  const mutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/question-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ generatedQuizQuestionId, quizSessionQuestionId, reason, comment }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to report question");
      return data;
    },
    onSuccess: () => setOpen(false),
  });

  if (mutation.isSuccess && !open) return <span className="text-xs font-semibold text-green-700">Question reported</span>;
  return (
    <div>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary">
          <Flag size={15} /> Report this question
        </button>
      ) : (
        <div className="mt-3 border-l-2 border-accent pl-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-primary">Report question</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close report form" className="text-muted hover:text-primary"><X size={17} /></button>
          </div>
          <select value={reason} onChange={(event) => setReason(event.target.value as typeof reason)} className="mt-3 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm">
            {reasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} placeholder="Optional details" className="mt-2 min-h-20 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" />
          <button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending} className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
            {mutation.isPending && <Loader2 size={15} className="animate-spin" />} Submit report
          </button>
          {mutation.isError && <p className="mt-2 text-xs font-semibold text-red-600">{(mutation.error as Error).message}</p>}
        </div>
      )}
    </div>
  );
}
