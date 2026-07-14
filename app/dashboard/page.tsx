"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  User,
  CheckCircle2,
  XCircle,
  Clock,
  Trophy,
  Video,
  ArrowRight,
  BarChart3,
  BookOpen,
  GraduationCap,
} from "lucide-react";
import { AuthGuard } from "../../components/auth-guard";
import { fadeInUp, staggerContainer, staggerItem } from "../../lib/animations";
import { useSupabaseAuth } from "../../lib/useSupabaseAuth";
import type { AssignedWork } from "../../lib/assigned-work";
import { AssignedWorkPanel } from "../../components/assigned-work-panel";

type Difficulty = "easy" | "medium" | "hard";

type DashboardResponse = {
  user: {
    id: string;
    email: string | null;
    referee_level: "level_1" | "level_2" | "level_3" | "level_4";
    question_level: "beginner" | "intermediate" | "hard";
  };
  learning: {
    modules_started: number;
    modules_passed: number;
    total_modules: number;
    required_modules: number;
    required_modules_passed: number;
    last_activity_at: string | null;
    modules: Array<{
      module_id: string;
      title: string;
      lessons_viewed: number;
      lesson_count: number;
      attempts: number;
      latest_score_percent: number;
      latest_correct_count: number;
      latest_attempts_count: number;
      assigned: boolean;
      passed: boolean;
      passed_at: string | null;
      last_activity_at: string | null;
    }>;
  };
  quiz_assignment: {
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
  assignedWork: AssignedWork;
  video_practice: {
    attempted: number;
    solved: number;
    by_difficulty: Record<Difficulty, { attempted: number; solved: number }>;
  };
  video_challenge: {
    attempted: number;
    solved: number;
    this_week: {
      week_start: string;
      attempted: number;
      solved: number;
      best_score: number | null;
    };
    weekly_history: Array<{
      week_start: string;
      attempted: number;
      solved: number;
      best_score: number | null;
      last_attempt_at: string | null;
    }>;
  };
  recent: {
    practice: Array<{
      id: string;
      question_id: string;
      created_at: string;
      correct: boolean | null;
      timed_out: boolean | null;
      time_taken_ms: number | null;
      difficulty: Difficulty | null;
    }>;
    challenge: Array<{
      id: string;
      question_id: string;
      created_at: string;
      correct: boolean | null;
      timed_out: boolean | null;
      time_taken_ms: number | null;
      difficulty: Difficulty | null;
      is_weekly: boolean | null;
      score: number | null;
    }>;
  };
};

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatWeekLabel(weekStartIso: string) {
  const d = new Date(weekStartIso);
  if (Number.isNaN(d.getTime())) return weekStartIso;
  return `Week of ${d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

function formatSeconds(ms: number | null) {
  if (typeof ms !== "number") return "—";
  return `${Math.max(0, Math.round(ms / 100) / 10)}s`;
}

function percent(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.max(0, Math.min(100, Math.round((numerator / denominator) * 100)));
}

function refLevelLabel(level: "level_1" | "level_2" | "level_3" | "level_4") {
  return `Level ${level.replace("level_", "")}`;
}

function AttemptBadge({ correct, timedOut }: { correct: boolean | null; timedOut: boolean | null }) {
  if (timedOut) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
        <Clock size={14} />
        Timed out
      </span>
    );
  }

  if (correct) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
        <CheckCircle2 size={14} />
        Correct
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
      <XCircle size={14} />
      Incorrect
    </span>
  );
}

function DifficultyPill({ difficulty }: { difficulty: Difficulty | null }) {
  const cls =
    difficulty === "easy"
      ? "bg-green-500"
      : difficulty === "hard"
        ? "bg-red-500"
        : "bg-accent";

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold text-white ${cls}`}>
      {difficulty ?? "—"}
    </span>
  );
}

export default function DashboardPage() {
  const { session } = useSupabaseAuth();

  const dashboardQuery = useQuery<DashboardResponse>({
    queryKey: ["dashboard"],
    enabled: !!session?.access_token,
    queryFn: async () => {
      const res = await fetch("/api/dashboard", {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to load dashboard");
      return res.json();
    },
  });

  const overview = useMemo(() => {
    const d = dashboardQuery.data;
    if (!d) return null;

    return {
      practicePct: percent(d.video_practice.solved, d.video_practice.attempted),
      challengePct: percent(d.video_challenge.solved, d.video_challenge.attempted),
    };
  }, [dashboardQuery.data]);

  return (
    <AuthGuard>
      <div className="min-h-screen pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-6">
          {/* Header */}
          <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="text-center mb-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-6"
            >
              <BarChart3 size={32} />
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-primary mb-3">Dashboard</h1>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              Your account, your permanent practice progress, and your weekly challenge history.
            </p>
          </motion.div>

          {/* Loading / Error */}
          {dashboardQuery.isLoading && (
            <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="card py-10 text-center">
              <p className="text-muted">Loading your stats…</p>
            </motion.div>
          )}
          {dashboardQuery.isError && (
            <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="card py-10 text-center">
              <p className="text-red-600 font-semibold mb-2">Couldn’t load dashboard</p>
              <p className="text-muted text-sm">Try refreshing. If this persists, check your session.</p>
            </motion.div>
          )}

          {dashboardQuery.data && overview && (
            <>
              <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="mb-8">
                <AssignedWorkPanel work={dashboardQuery.data.assignedWork} />
              </motion.div>
              {/* Account + Overview */}
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="grid lg:grid-cols-3 gap-6 mb-8"
              >
                <motion.div variants={staggerItem} className="card lg:col-span-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                      <User size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary">Account</p>
                      <p className="text-xs text-muted">Signed in</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">Email</p>
                      <p className="text-ink font-medium break-all">{dashboardQuery.data.user.email ?? session?.user?.email ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">User ID</p>
                      <p className="text-ink font-mono text-sm break-all">{dashboardQuery.data.user.id}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">Referee Level</p>
                      <p className="text-ink font-medium">
                        {refLevelLabel(dashboardQuery.data.user.referee_level)} · {dashboardQuery.data.user.question_level}
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={staggerItem} className="card lg:col-span-2">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-surface border border-border md:col-span-2">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Learning Modules</p>
                        <Link href="/learn" className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1">
                          Learn <ArrowRight size={14} />
                        </Link>
                      </div>
                      <p className="text-2xl font-display font-bold text-primary">
                        {dashboardQuery.data.learning.modules_passed} passed / {dashboardQuery.data.learning.total_modules}
                      </p>
                      <div className="mt-3 h-2 rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full bg-green-500"
                          style={{ width: `${percent(dashboardQuery.data.learning.modules_passed, dashboardQuery.data.learning.total_modules)}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-muted">
                        {dashboardQuery.data.learning.modules_started} module(s) started
                        {dashboardQuery.data.learning.required_modules > 0
                          ? ` · required ${dashboardQuery.data.learning.required_modules_passed}/${dashboardQuery.data.learning.required_modules}`
                          : ""}
                        {dashboardQuery.data.learning.last_activity_at ? ` · latest activity ${formatDateTime(dashboardQuery.data.learning.last_activity_at)}` : ""}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-surface border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Practice (Permanent)</p>
                        <Link href="/practice" className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1">
                          Go <ArrowRight size={14} />
                        </Link>
                      </div>
                      <p className="text-2xl font-display font-bold text-primary">
                        {dashboardQuery.data.video_practice.solved} / {dashboardQuery.data.video_practice.attempted}
                      </p>
                      <div className="mt-3 h-2 rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full bg-accent"
                          style={{ width: `${overview.practicePct}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-muted">{overview.practicePct}% correct overall</p>
                    </div>

                    <div className="p-4 rounded-xl bg-surface border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Weekly Challenge</p>
                        <Link href="/challenge" className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1">
                          Compete <ArrowRight size={14} />
                        </Link>
                      </div>
                      <p className="text-2xl font-display font-bold text-primary">
                        {dashboardQuery.data.video_challenge.solved} / {dashboardQuery.data.video_challenge.attempted}
                      </p>
                      <div className="mt-3 h-2 rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${overview.challengePct}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-muted">{overview.challengePct}% correct overall</p>
                    </div>
                  </div>

                  <div className="mt-5 p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <p className="text-sm font-semibold text-primary mb-1">This week</p>
                    <p className="text-sm text-ink">
                      {dashboardQuery.data.video_challenge.this_week.attempted > 0
                        ? `Attempted ${dashboardQuery.data.video_challenge.this_week.attempted} time(s), best score ${dashboardQuery.data.video_challenge.this_week.best_score ?? 0}.`
                        : "No weekly attempt yet. Take the weekly challenge to appear on the leaderboard."}
                    </p>
                  </div>
                </motion.div>
              </motion.div>

              <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="card mb-8">
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-700 flex items-center justify-center">
                      <GraduationCap size={20} />
                    </div>
                    <div>
                      <p className="text-lg font-display font-bold text-primary">Learning modules</p>
                      <p className="text-sm text-muted">Required modules are assigned by an admin. All modules remain available.</p>
                    </div>
                  </div>
                  <Link href="/learn" className="pill text-white text-sm py-2">
                    Learn
                    <ArrowRight size={16} />
                  </Link>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dashboardQuery.data.learning.modules.map((module) => (
                    <div key={module.module_id} className="p-4 rounded-xl bg-surface border border-border">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="font-semibold text-primary">{module.title}</p>
                          <p className="text-xs text-muted">
                            {module.lessons_viewed}/{module.lesson_count} lessons · {module.attempts} attempts
                            {module.assigned ? " · required" : ""}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${
                          module.passed
                            ? "bg-green-50 border-green-200 text-green-700"
                            : module.assigned
                              ? "bg-primary/10 border-primary/20 text-primary"
                            : module.lessons_viewed > 0 || module.attempts > 0
                              ? "bg-amber-50 border-amber-200 text-amber-700"
                              : "bg-white border-border text-muted"
                        }`}>
                          {module.passed ? <CheckCircle2 size={14} /> : <BookOpen size={14} />}
                          {module.passed ? "Passed" : module.assigned ? "Required" : module.lessons_viewed > 0 || module.attempts > 0 ? "In progress" : "Not started"}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white border border-border overflow-hidden">
                        <div
                          className={`h-full ${module.passed ? "bg-green-500" : "bg-primary"}`}
                          style={{ width: `${Math.min(100, module.latest_score_percent)}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-muted">
                        Latest score {module.latest_score_percent}% ({module.latest_correct_count}/{Math.max(module.latest_attempts_count, 10)})
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Practice Section */}
              <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="card mb-8">
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                      <Video size={20} />
                    </div>
                    <div>
                      <p className="text-lg font-display font-bold text-primary">Practice solves</p>
                      <p className="text-sm text-muted">Permanent clips (you won’t see the same clip twice).</p>
                    </div>
                  </div>
                  <Link href="/practice" className="pill text-white text-sm py-2">
                    Practice
                    <ArrowRight size={16} />
                  </Link>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  {(["easy", "medium", "hard"] as const).map((diff) => {
                    const row = dashboardQuery.data.video_practice.by_difficulty[diff];
                    return (
                      <div key={diff} className="p-4 rounded-xl bg-surface border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-primary capitalize">{diff}</p>
                          <DifficultyPill difficulty={diff} />
                        </div>
                        <p className="text-2xl font-display font-bold text-primary">{row.solved} / {row.attempted}</p>
                        <p className="text-xs text-muted mt-2">{percent(row.solved, row.attempted)}% correct</p>
                      </div>
                    );
                  })}
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">Recent practice attempts</p>
                  {dashboardQuery.data.recent.practice.length === 0 ? (
                    <p className="text-muted">No practice attempts yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {dashboardQuery.data.recent.practice.map((a) => (
                        <div key={a.id} className="p-4 rounded-xl bg-white border border-border flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <AttemptBadge correct={a.correct} timedOut={a.timed_out} />
                            <DifficultyPill difficulty={a.difficulty} />
                            <p className="text-sm text-muted">{formatDateTime(a.created_at)}</p>
                          </div>
                          <p className="text-sm text-ink">Time: <span className="font-semibold">{formatSeconds(a.time_taken_ms)}</span></p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Challenge Section */}
              <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="card">
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 text-white flex items-center justify-center shadow-sm">
                      <Trophy size={20} />
                    </div>
                    <div>
                      <p className="text-lg font-display font-bold text-primary">Weekly challenge solves</p>
                      <p className="text-sm text-muted">These clips rotate weekly; your history stays.</p>
                    </div>
                  </div>
                  <Link href="/challenge" className="pill text-white text-sm py-2">
                    Challenge
                    <ArrowRight size={16} />
                  </Link>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-surface border border-border">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">This week</p>
                    <p className="text-sm text-muted mb-1">{formatWeekLabel(dashboardQuery.data.video_challenge.this_week.week_start)}</p>
                    <p className="text-2xl font-display font-bold text-primary">
                      {dashboardQuery.data.video_challenge.this_week.attempted > 0
                        ? `${dashboardQuery.data.video_challenge.this_week.solved} / ${dashboardQuery.data.video_challenge.this_week.attempted}`
                        : "—"}
                    </p>
                    <p className="text-sm text-ink mt-2">
                      Best score: <span className="font-semibold">{dashboardQuery.data.video_challenge.this_week.best_score ?? "—"}</span>
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-surface border border-border">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">All-time challenges</p>
                    <p className="text-2xl font-display font-bold text-primary">
                      {dashboardQuery.data.video_challenge.solved} / {dashboardQuery.data.video_challenge.attempted}
                    </p>
                    <p className="text-xs text-muted mt-2">Includes weekly and any older challenge clips.</p>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">Weekly history</p>
                  {dashboardQuery.data.video_challenge.weekly_history.length === 0 ? (
                    <p className="text-muted">No weekly attempts yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {dashboardQuery.data.video_challenge.weekly_history.slice(0, 8).map((w) => (
                        <div key={w.week_start} className="p-4 rounded-xl bg-white border border-border flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-primary">{formatWeekLabel(w.week_start)}</p>
                            <p className="text-xs text-muted">Last attempt: {w.last_attempt_at ? formatDateTime(w.last_attempt_at) : "—"}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-ink">
                              Solved: <span className="font-semibold">{w.solved}</span> / {w.attempted}
                            </span>
                            <span className="text-sm text-ink">
                              Best score: <span className="font-semibold">{w.best_score ?? "—"}</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">Recent challenge attempts</p>
                  {dashboardQuery.data.recent.challenge.length === 0 ? (
                    <p className="text-muted">No challenge attempts yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {dashboardQuery.data.recent.challenge.map((a) => (
                        <div key={a.id} className="p-4 rounded-xl bg-white border border-border flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <AttemptBadge correct={a.correct} timedOut={a.timed_out} />
                            <DifficultyPill difficulty={a.difficulty} />
                            {a.is_weekly && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                                Weekly
                              </span>
                            )}
                            <p className="text-sm text-muted">{formatDateTime(a.created_at)}</p>
                          </div>
                          <div className="flex items-center gap-6">
                            <p className="text-sm text-ink">Time: <span className="font-semibold">{formatSeconds(a.time_taken_ms)}</span></p>
                            <p className="text-sm text-ink">Score: <span className="font-semibold">{a.score ?? "—"}</span></p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
