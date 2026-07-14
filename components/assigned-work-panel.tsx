import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, Clock3, Target } from "lucide-react";
import type { AssignedWork } from "../lib/assigned-work";

function progress(value: number, total: number) {
  return total ? Math.min(100, Math.max(0, Math.round((value / total) * 100))) : 0;
}

function dateLabel(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function AssignedWorkPanel({ work, compact = false }: { work: AssignedWork; compact?: boolean }) {
  const { adaptive, programs, summary } = work;
  const completedPrograms = programs.filter((program) => program.status === "completed").length;

  return (
    <section className={`relative overflow-hidden rounded-2xl border ${summary.hasOutstandingWork ? "border-primary/20 bg-primary text-white" : "border-green-200 bg-green-50 text-primary"} ${compact ? "p-5" : "p-6 md:p-7"}`} aria-labelledby="assigned-work-title">
      <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full border-[28px] border-white/5" aria-hidden="true" />
      <div className="relative flex flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${summary.hasOutstandingWork ? "bg-white/10" : "bg-green-100 text-green-700"}`}><ClipboardCheck size={22} /></span>
            <div>
              <p className={`text-xs font-bold uppercase tracking-[0.16em] ${summary.hasOutstandingWork ? "text-white/60" : "text-green-700"}`}>Assigned work</p>
              <h2 id="assigned-work-title" className="mt-1 text-2xl font-display font-bold">
                {!summary.hasAssignments ? "You’re all clear" : summary.hasOutstandingWork ? `${summary.outstandingCount} requirement${summary.outstandingCount === 1 ? "" : "s"} remaining` : "All assignments complete"}
              </h2>
              {summary.nextDueAt ? <p className={`mt-1 text-sm ${summary.hasOutstandingWork ? "text-white/70" : "text-muted"}`}><Clock3 size={14} className="mr-1 inline" />Next due {dateLabel(summary.nextDueAt)}</p> : null}
            </div>
          </div>
          <Link href="/quiz" className={`inline-flex items-center gap-2 self-start rounded-full px-4 py-2 text-sm font-bold transition ${summary.hasOutstandingWork ? "bg-white text-primary hover:bg-white/90" : "bg-primary text-white"}`}>
            {summary.hasOutstandingWork ? "Continue quizzes" : "Open quiz lab"}<ArrowRight size={16} />
          </Link>
        </div>

        {summary.hasAssignments ? (
          <div className={`grid gap-3 ${compact ? "sm:grid-cols-2" : "lg:grid-cols-2"}`}>
            {adaptive.assigned ? (
              <div className={`rounded-xl border p-4 ${summary.hasOutstandingWork ? "border-white/15 bg-white/10" : "border-green-200 bg-white"}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-sm font-bold"><Target size={17} />Adaptive question quota</p>
                  {adaptive.passed ? <CheckCircle2 size={18} className="text-green-400" /> : adaptive.status === "score_required" ? <AlertTriangle size={18} className="text-amber-300" /> : null}
                </div>
                <p className={`mt-2 text-2xl font-display font-bold ${summary.hasOutstandingWork ? "text-white" : "text-primary"}`}>{adaptive.attempted}/{adaptive.questionQuota}</p>
                <div className={`mt-3 h-2 overflow-hidden rounded-full ${summary.hasOutstandingWork ? "bg-white/15" : "bg-border"}`}><div className={`h-full rounded-full ${adaptive.passed ? "bg-green-400" : "bg-accent"}`} style={{ width: `${progress(adaptive.attempted, adaptive.questionQuota)}%` }} /></div>
                <p className={`mt-2 text-xs ${summary.hasOutstandingWork ? "text-white/70" : "text-muted"}`}>
                  {adaptive.status === "score_required" ? `Quota reached; keep practicing to reach ${adaptive.requiredPercent}%.` : `${adaptive.scorePercent}% score · ${adaptive.requiredPercent}% required`}
                </p>
              </div>
            ) : null}

            {programs.length ? (
              <div className={`rounded-xl border p-4 ${summary.hasOutstandingWork ? "border-white/15 bg-white/10" : "border-green-200 bg-white"}`}>
                <p className="text-sm font-bold">Assigned quiz programs</p>
                <p className={`mt-2 text-2xl font-display font-bold ${summary.hasOutstandingWork ? "text-white" : "text-primary"}`}>{completedPrograms}/{programs.length}</p>
                <p className={`mt-2 text-xs ${summary.hasOutstandingWork ? "text-white/70" : "text-muted"}`}>{programs.reduce((sum, item) => sum + item.remainingPasses, 0)} passing quiz result(s) remaining</p>
                {!compact ? <div className="mt-3 space-y-2">{programs.slice(0, 3).map((program) => <div key={program.assignmentId} className="flex items-center justify-between gap-3 text-xs"><span className="truncate font-semibold">{program.title}</span><span className="shrink-0 opacity-75">{program.passedQuizzes}/{program.requiredPasses} passed</span></div>)}</div> : null}
              </div>
            ) : null}
          </div>
        ) : <p className={`text-sm ${summary.hasOutstandingWork ? "text-white/70" : "text-muted"}`}>No quiz quota or program has been assigned. Adaptive practice remains available anytime.</p>}
      </div>
    </section>
  );
}
