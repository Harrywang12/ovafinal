"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Shield,
  Trash2,
  RefreshCcw,
  Video,
  GraduationCap,
  BarChart3,
  Users,
  UserRoundCog,
  MailPlus,
  Loader2,
  Library,
  Activity,
  Settings2,
} from "lucide-react";
import { AuthGuard } from "../../components/auth-guard";
import { useSupabaseAuth } from "../../lib/useSupabaseAuth";
import { useAdminAccess } from "../../lib/useAdminAccess";
import { fadeInUp, scaleIn, staggerContainer, staggerItem } from "../../lib/animations";

type VideoQuestionRow = {
  id: string;
  kind: "practice" | "challenge";
  difficulty: "easy" | "medium" | "hard";
  video_url: string;
  pause_at_seconds: number;
  answer_window_seconds: number | null;
  options: string[];
  correct_option_index: number;
  rule_reference: string | null;
  is_weekly: boolean;
  category: "indoor" | "beach";
  created_at: string;
};

type LearningProgressRow = {
  user_id: string;
  email: string | null;
  referee_level: "level_1" | "level_2" | "level_3" | "level_4";
  question_level: "beginner" | "intermediate" | "hard";
  modules_started: number;
  modules_passed: number;
  assigned_modules: number;
  assigned_modules_passed: number;
  total_modules: number;
  attempts: number;
  average_score_percent: number;
  last_activity_at: string | null;
  module_scores: Array<{
    module_id: string;
    title: string;
    attempts: number;
    latest_score_percent: number;
    assigned: boolean;
    passed: boolean;
  }>;
};

type AssignmentData = {
  modules: Array<{
    id: string;
    title: string;
    category: string;
    chapterLabel: string;
  }>;
  learners: Array<{
    user_id: string;
    email: string | null;
    referee_level: "level_1" | "level_2" | "level_3" | "level_4";
    assigned_module_ids: string[];
  }>;
};

type QuizAssignmentProgress = {
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

type QuizAssignmentData = {
  learners: Array<{
    user_id: string;
    email: string | null;
    referee_level: "level_1" | "level_2" | "level_3" | "level_4";
    quiz_assignment: QuizAssignmentProgress;
  }>;
};

type AdminListData = {
  admins: Array<{
    email: string;
    created_at: string | null;
    created_by: string | null;
    source: "database" | "environment";
  }>;
};

export default function AdminPage() {
  const { session } = useSupabaseAuth();
  const adminAccess = useAdminAccess(session);
  const [kindFilter, setKindFilter] = useState<"all" | "practice" | "challenge">("all");
  const [activePanel, setActivePanel] = useState<"videos" | "learning" | "access">("videos");
  const [selectedLearnerIds, setSelectedLearnerIds] = useState<string[]>([]);
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  const [quizQuota, setQuizQuota] = useState<number>(50);
  const [quizRequiredPercent, setQuizRequiredPercent] = useState<number>(70);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const isAdmin = adminAccess.data?.isAdmin === true;

  const listQuery = useQuery({
    queryKey: ["admin", "video-questions", kindFilter],
    enabled: !!session?.access_token && isAdmin,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (kindFilter !== "all") params.set("kind", kindFilter);
      const res = await fetch(`/api/admin/video-questions?${params.toString()}`.replace(/\?$/, ""), {
        headers: {
          Authorization: `Bearer ${session!.access_token}`,
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load video questions");
      }
      return res.json() as Promise<{ questions: VideoQuestionRow[] }>;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/video-questions/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session!.access_token}`,
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete");
      }
      return res.json();
    },
    onSuccess: () => {
      listQuery.refetch();
    },
  });

  const learningQuery = useQuery({
    queryKey: ["admin", "learning-progress"],
    enabled: !!session?.access_token && isAdmin && activePanel === "learning",
    queryFn: async () => {
      const res = await fetch("/api/admin/learning-progress", {
        headers: {
          Authorization: `Bearer ${session!.access_token}`,
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load learning progress");
      }
      return res.json() as Promise<{ learners: LearningProgressRow[] }>;
    },
  });

  const assignmentQuery = useQuery({
    queryKey: ["admin", "module-assignments"],
    enabled: !!session?.access_token && isAdmin && activePanel === "learning",
    queryFn: async () => {
      const res = await fetch("/api/admin/module-assignments", {
        headers: {
          Authorization: `Bearer ${session!.access_token}`,
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load module assignments");
      }
      return res.json() as Promise<AssignmentData>;
    },
  });

  const assignmentMutation = useMutation({
    mutationFn: async (action: "assign" | "unassign") => {
      const res = await fetch("/api/admin/module-assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session!.access_token}`,
        },
        body: JSON.stringify({
          action,
          user_ids: selectedLearnerIds,
          module_ids: selectedModuleIds,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update assignments");
      }
      return res.json();
    },
    onSuccess: () => {
      assignmentQuery.refetch();
      learningQuery.refetch();
    },
  });

  const quizAssignmentQuery = useQuery({
    queryKey: ["admin", "quiz-assignments"],
    enabled: !!session?.access_token && isAdmin && activePanel === "learning",
    queryFn: async () => {
      const res = await fetch("/api/admin/quiz-assignments", {
        headers: {
          Authorization: `Bearer ${session!.access_token}`,
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load quiz assignments");
      }
      return res.json() as Promise<QuizAssignmentData>;
    },
  });

  const quizAssignmentMutation = useMutation({
    mutationFn: async (action: "assign" | "clear") => {
      const res = await fetch("/api/admin/quiz-assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session!.access_token}`,
        },
        body: JSON.stringify({
          action,
          user_ids: selectedLearnerIds,
          question_quota: quizQuota,
          required_percent: quizRequiredPercent,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update quiz assignments");
      }
      return res.json();
    },
    onSuccess: () => {
      quizAssignmentQuery.refetch();
      learningQuery.refetch();
    },
  });

  const adminsQuery = useQuery({
    queryKey: ["admin", "admins"],
    enabled: !!session?.access_token && isAdmin && activePanel === "access",
    queryFn: async () => {
      const res = await fetch("/api/admin/admins", {
        headers: {
          Authorization: `Bearer ${session!.access_token}`,
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load administrators");
      }
      return res.json() as Promise<AdminListData>;
    },
  });

  const addAdminMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session!.access_token}`,
        },
        body: JSON.stringify({ email: newAdminEmail }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to add administrator");
      }
      return res.json();
    },
    onSuccess: () => {
      setNewAdminEmail("");
      adminsQuery.refetch();
    },
  });

  const removeAdminMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/admin/admins", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session!.access_token}`,
        },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to remove administrator");
      }
      return res.json();
    },
    onSuccess: () => {
      adminsQuery.refetch();
    },
  });

  const toggleSelected = (value: string, current: string[], setValue: (next: string[]) => void) => {
    setValue(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  const refLevelLabel = (level: LearningProgressRow["referee_level"]) => `Level ${level.replace("level_", "")}`;
  const quizProgressByUser = useMemo(() => {
    return new Map((quizAssignmentQuery.data?.learners || []).map((learner) => [learner.user_id, learner.quiz_assignment]));
  }, [quizAssignmentQuery.data?.learners]);

  return (
    <AuthGuard>
      <div className="admin-shell min-h-screen pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {adminAccess.isLoading ? (
            <motion.div variants={scaleIn} initial="hidden" animate="visible" className="admin-surface mx-auto max-w-lg p-10 text-center">
              <Loader2 className="mx-auto animate-spin text-primary" size={28} />
              <p className="mt-3 text-muted">Checking admin access…</p>
            </motion.div>
          ) : !isAdmin ? (
            <motion.div variants={scaleIn} initial="hidden" animate="visible" className="admin-surface mx-auto max-w-lg p-10 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Shield size={28} />
              </div>
              <p className="text-xl font-display font-bold text-ink">Admin access required</p>
              <p className="text-muted mt-2">Ask an existing administrator to add your email to the access list.</p>
            </motion.div>
          ) : (
            <>
              <motion.section
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                className="admin-hero mb-6 overflow-hidden rounded-[2rem] text-white"
              >
                <div className="relative z-10 grid gap-8 p-7 md:grid-cols-[1fr_auto] md:items-end md:p-10">
                  <div>
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white/75">
                      <Activity size={14} />
                      Operations console
                    </div>
                    <h1 className="max-w-3xl text-4xl font-display font-bold leading-[0.95] md:text-6xl">
                      Keep training sharp.
                    </h1>
                    <p className="mt-4 max-w-2xl text-base text-white/65 md:text-lg">
                      Publish match scenarios, assign learning, monitor progress, and control administrator access.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/15 bg-black/15 px-5 py-4 backdrop-blur-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/50">Signed in as</p>
                    <p className="mt-1 max-w-64 truncate font-semibold text-white">{adminAccess.data?.email}</p>
                  </div>
                </div>
              </motion.section>

              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="mb-6 grid gap-3 sm:grid-cols-3"
              >
                {[
                  {
                    label: "Video library",
                    value: listQuery.data?.questions.length ?? "—",
                    detail: "Published scenarios",
                    icon: Library,
                  },
                  {
                    label: "Learners",
                    value: learningQuery.data?.learners.length ?? assignmentQuery.data?.learners.length ?? "—",
                    detail: "Tracked profiles",
                    icon: Users,
                  },
                  {
                    label: "Administrators",
                    value: adminsQuery.data?.admins.length ?? "—",
                    detail: "Authorized emails",
                    icon: UserRoundCog,
                  },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div key={stat.label} variants={staggerItem} className="admin-metric">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{stat.label}</p>
                          <p className="mt-2 text-3xl font-display font-bold text-ink">{stat.value}</p>
                          <p className="mt-1 text-sm text-muted">{stat.detail}</p>
                        </div>
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon size={20} />
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>

              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="admin-toolbar mb-6 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {(["videos", "learning", "access"] as const).map((panel) => (
                    <motion.button
                      key={panel}
                      variants={staggerItem}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActivePanel(panel)}
                      className={
                        activePanel === panel
                          ? "admin-tab admin-tab-active"
                          : "admin-tab"
                      }
                    >
                      {panel === "videos" ? <Video size={16} /> : panel === "learning" ? <GraduationCap size={16} /> : <UserRoundCog size={16} />}
                      {panel === "videos" ? "Video library" : panel === "learning" ? "Learning" : "Admin access"}
                    </motion.button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <motion.button
                    variants={staggerItem}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (activePanel === "videos") listQuery.refetch();
                      if (activePanel === "learning") {
                        learningQuery.refetch();
                        assignmentQuery.refetch();
                        quizAssignmentQuery.refetch();
                      }
                      if (activePanel === "access") adminsQuery.refetch();
                    }}
                    className="admin-icon-button"
                    aria-label="Refresh current panel"
                  >
                    <RefreshCcw size={18} />
                  </motion.button>
                  {activePanel === "videos" && (
                    <Link className="admin-primary-button" href="/admin/new">
                      <Plus size={18} />
                      New scenario
                    </Link>
                  )}
                </div>
              </motion.div>

              {activePanel === "videos" && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="mr-1 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
                    <Settings2 size={14} />
                    Filter
                  </span>
                  {(["all", "practice", "challenge"] as const).map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => setKindFilter(kind)}
                      className={kindFilter === kind ? "admin-filter admin-filter-active" : "admin-filter"}
                    >
                      {kind === "all" ? "All scenarios" : kind}
                    </button>
                  ))}
                </div>
              )}

              {activePanel === "videos" ? (
              <motion.div variants={scaleIn} initial="hidden" animate="visible" className="admin-surface p-5 md:p-7">
                <div className="flex items-center gap-3 mb-5">
                  <Video className="text-accent" size={22} />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">Library</p>
                    <h2 className="text-lg font-display font-bold text-primary">Video Questions</h2>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {listQuery.isLoading ? (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-10 text-center">
                      <p className="text-muted">Loading…</p>
                    </motion.div>
                  ) : listQuery.isError ? (
                    <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-10 text-center">
                      <p className="text-red-600 font-semibold">{(listQuery.error as Error).message}</p>
                    </motion.div>
                  ) : (listQuery.data?.questions?.length || 0) === 0 ? (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-10 text-center">
                      <p className="text-muted">No video questions yet.</p>
                      <p className="text-muted text-sm mt-1">Click “New Video Challenge” to add one.</p>
                    </motion.div>
                  ) : (
                    <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-muted border-b border-border">
                            <th className="py-3 pr-4">Kind</th>
                             <th className="py-3 pr-4">Category</th>
                             <th className="py-3 pr-4">Difficulty</th>
                            <th className="py-3 pr-4">Pause</th>
                            <th className="py-3 pr-4">Window</th>
                            <th className="py-3 pr-4">Weekly</th>
                            <th className="py-3 pr-4">Rule</th>
                            <th className="py-3 pr-4">Created</th>
                            <th className="py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {listQuery.data!.questions.map((q) => (
                            <tr key={q.id} className="border-b border-border/60">
                              <td className="py-3 pr-4 font-semibold text-primary capitalize">{q.kind}</td>
                               <td className="py-3 pr-4">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  q.category === "beach" ? "bg-cyan-100 text-cyan-700" : "bg-blue-100 text-blue-700"
                                }`}>
                                  {q.category === "beach" ? "🏖️ Beach" : "🏐 Indoor"}
                                </span>
                              </td>
                               <td className="py-3 pr-4 capitalize">{q.difficulty}</td>
                              <td className="py-3 pr-4">{q.pause_at_seconds}s</td>
                              <td className="py-3 pr-4">{q.answer_window_seconds ? `${q.answer_window_seconds}s` : "Default"}</td>
                              <td className="py-3 pr-4">{q.is_weekly ? "Yes" : "No"}</td>
                              <td className="py-3 pr-4">{q.rule_reference || "—"}</td>
                              <td className="py-3 pr-4">{new Date(q.created_at).toLocaleDateString()}</td>
                              <td className="py-3 text-right">
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => deleteMutation.mutate(q.id)}
                                  disabled={deleteMutation.isPending}
                                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 border border-red-100 hover:bg-red-100 disabled:opacity-60"
                                >
                                  <Trash2 size={16} />
                                  Delete
                                </motion.button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
              ) : activePanel === "learning" ? (
              <motion.div variants={scaleIn} initial="hidden" animate="visible" className="admin-surface p-5 md:p-7">
                <div className="flex items-center gap-3 mb-5">
                  <BarChart3 className="text-accent" size={22} />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">Roster</p>
                    <h2 className="text-lg font-display font-bold text-primary">Learning Progress</h2>
                  </div>
                </div>

                <div className="mb-6 rounded-2xl border border-border bg-surface p-4">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    <div className="flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Select learners</p>
                      {assignmentQuery.isLoading ? (
                        <p className="text-sm text-muted">Loading learners…</p>
                      ) : (
                        <div className="max-h-48 overflow-auto rounded-xl bg-white border border-border p-2 space-y-1">
                          {(assignmentQuery.data?.learners || []).map((learner) => (
                            <label key={learner.user_id} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-surface cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedLearnerIds.includes(learner.user_id)}
                                onChange={() => toggleSelected(learner.user_id, selectedLearnerIds, setSelectedLearnerIds)}
                              />
                              <span className="min-w-0">
                                <span className="block text-sm font-semibold text-primary truncate">{learner.email || learner.user_id}</span>
                                <span className="block text-xs text-muted">{refLevelLabel(learner.referee_level)} · {learner.assigned_module_ids.length} assigned</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Select modules</p>
                      {assignmentQuery.isLoading ? (
                        <p className="text-sm text-muted">Loading modules…</p>
                      ) : (
                        <div className="max-h-48 overflow-auto rounded-xl bg-white border border-border p-2 space-y-1">
                          {(assignmentQuery.data?.modules || []).map((module) => (
                            <label key={module.id} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-surface cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedModuleIds.includes(module.id)}
                                onChange={() => toggleSelected(module.id, selectedModuleIds, setSelectedModuleIds)}
                              />
                              <span className="min-w-0">
                                <span className="block text-sm font-semibold text-primary truncate">{module.title}</span>
                                <span className="block text-xs text-muted">{module.chapterLabel} · {module.category}</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-muted">
                      {selectedLearnerIds.length} learner(s), {selectedModuleIds.length} module(s) selected
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => assignmentMutation.mutate("assign")}
                        disabled={selectedLearnerIds.length === 0 || selectedModuleIds.length === 0 || assignmentMutation.isPending}
                        className="px-4 py-2 rounded-full bg-primary text-white text-sm font-semibold disabled:opacity-50"
                      >
                        Assign Required
                      </button>
                      <button
                        type="button"
                        onClick={() => assignmentMutation.mutate("unassign")}
                        disabled={selectedLearnerIds.length === 0 || selectedModuleIds.length === 0 || assignmentMutation.isPending}
                        className="px-4 py-2 rounded-full bg-white border border-border text-primary text-sm font-semibold disabled:opacity-50"
                      >
                        Unassign
                      </button>
                    </div>
                  </div>
                  {assignmentMutation.isError && (
                    <p className="mt-3 text-sm font-semibold text-red-600">{(assignmentMutation.error as Error).message}</p>
                  )}
                </div>

                <div className="mb-6 rounded-2xl border border-border bg-white p-4">
                  <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                    <div className="flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Standalone quiz quota</p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <label className="block">
                          <span className="block text-sm font-medium text-primary mb-1">Problems required</span>
                          <input
                            type="number"
                            min={1}
                            value={quizQuota}
                            onChange={(e) => setQuizQuota(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                          />
                        </label>
                        <label className="block">
                          <span className="block text-sm font-medium text-primary mb-1">Required correct %</span>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={quizRequiredPercent}
                            onChange={(e) => setQuizRequiredPercent(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                          />
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => quizAssignmentMutation.mutate("assign")}
                        disabled={selectedLearnerIds.length === 0 || quizAssignmentMutation.isPending}
                        className="px-4 py-2 rounded-full bg-accent text-white text-sm font-semibold disabled:opacity-50"
                      >
                        Assign Quiz Quota
                      </button>
                      <button
                        type="button"
                        onClick={() => quizAssignmentMutation.mutate("clear")}
                        disabled={selectedLearnerIds.length === 0 || quizAssignmentMutation.isPending}
                        className="px-4 py-2 rounded-full bg-white border border-border text-primary text-sm font-semibold disabled:opacity-50"
                      >
                        Clear Quota
                      </button>
                    </div>
                  </div>
                  {quizAssignmentMutation.isError && (
                    <p className="mt-3 text-sm font-semibold text-red-600">{(quizAssignmentMutation.error as Error).message}</p>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {learningQuery.isLoading ? (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-10 text-center">
                      <p className="text-muted">Loading…</p>
                    </motion.div>
                  ) : learningQuery.isError ? (
                    <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-10 text-center">
                      <p className="text-red-600 font-semibold">{(learningQuery.error as Error).message}</p>
                    </motion.div>
                  ) : (learningQuery.data?.learners?.length || 0) === 0 ? (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-10 text-center">
                      <p className="text-muted">No learner profiles yet.</p>
                    </motion.div>
                  ) : (
                    <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-muted border-b border-border">
                            <th className="py-3 pr-4">Learner</th>
                            <th className="py-3 pr-4">Level</th>
                            <th className="py-3 pr-4">Modules</th>
                            <th className="py-3 pr-4">Quiz Quota</th>
                            <th className="py-3 pr-4">Attempts</th>
                            <th className="py-3 pr-4">Average</th>
                            <th className="py-3 pr-4">Last Activity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {learningQuery.data!.learners.map((learner) => (
                            <tr key={learner.user_id} className="border-b border-border/60 align-top">
                              <td className="py-3 pr-4">
                                <p className="font-semibold text-primary break-all">{learner.email || "No email"}</p>
                                <p className="text-xs font-mono text-muted break-all">{learner.user_id}</p>
                              </td>
                              <td className="py-3 pr-4">
                                <span className="inline-flex px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                  {refLevelLabel(learner.referee_level)}
                                </span>
                                <p className="mt-1 text-xs text-muted capitalize">{learner.question_level}</p>
                              </td>
                              <td className="py-3 pr-4">
                                <p className="font-semibold text-ink">{learner.modules_passed}/{learner.total_modules} passed</p>
                                <p className="text-xs text-muted">
                                  {learner.modules_started} started · required {learner.assigned_modules_passed}/{learner.assigned_modules}
                                </p>
                              </td>
                              <td className="py-3 pr-4">
                                {(() => {
                                  const quiz = quizProgressByUser.get(learner.user_id);
                                  if (!quiz?.assigned) {
                                    return <span className="text-muted">—</span>;
                                  }
                                  return (
                                    <div className="min-w-28">
                                      <p className={`font-semibold ${quiz.passed ? "text-green-700" : "text-ink"}`}>
                                        {quiz.correct}/{quiz.attempted} correct
                                      </p>
                                      <p className="text-xs text-muted">
                                        {quiz.attempted}/{quiz.question_quota} done · need {quiz.required_percent}%
                                      </p>
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="py-3 pr-4">{learner.attempts}</td>
                              <td className="py-3 pr-4">
                                <div className="min-w-24">
                                  <p className="font-semibold text-ink">{learner.average_score_percent}%</p>
                                  <div className="mt-1 h-1.5 rounded-full bg-border overflow-hidden">
                                    <div className="h-full bg-accent" style={{ width: `${learner.average_score_percent}%` }} />
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 pr-4">
                                {learner.last_activity_at ? new Date(learner.last_activity_at).toLocaleString() : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
              ) : (
                <motion.div variants={scaleIn} initial="hidden" animate="visible" className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
                  <section className="admin-surface p-5 md:p-7">
                    <div className="mb-6 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Permissions</p>
                        <h2 className="mt-1 text-2xl font-display font-bold text-ink">Administrator access</h2>
                        <p className="mt-2 max-w-2xl text-sm text-muted">
                          Every email below can open this console and use protected admin APIs.
                        </p>
                      </div>
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <UserRoundCog size={22} />
                      </span>
                    </div>

                    {adminsQuery.isLoading ? (
                      <div className="py-12 text-center text-muted">Loading administrators…</div>
                    ) : adminsQuery.isError ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                        {(adminsQuery.error as Error).message}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(adminsQuery.data?.admins || []).map((item) => {
                          const isCurrentUser = item.email === adminAccess.data?.email;
                          return (
                            <div key={item.email} className="admin-person-row">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-white">
                                  {item.email.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-ink">{item.email}</p>
                                  <p className="text-xs text-muted">
                                    {item.source === "environment" ? "Environment configured" : item.created_at ? `Added ${new Date(item.created_at).toLocaleDateString()}` : "Database managed"}
                                    {isCurrentUser ? " · You" : ""}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeAdminMutation.mutate(item.email)}
                                disabled={isCurrentUser || item.source === "environment" || removeAdminMutation.isPending}
                                className="rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Remove
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {removeAdminMutation.isError && (
                      <p className="mt-4 text-sm font-semibold text-red-600">{(removeAdminMutation.error as Error).message}</p>
                    )}
                  </section>

                  <aside className="admin-access-card p-6 text-white md:p-7">
                    <MailPlus size={26} className="text-[#ff7a8d]" />
                    <h3 className="mt-6 text-2xl font-display font-bold">Grant access</h3>
                    <p className="mt-2 text-sm leading-6 text-white/60">
                      Add the email used by the person’s Supabase account. Access takes effect on their next authorization check.
                    </p>
                    <form
                      className="mt-6 space-y-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        addAdminMutation.mutate();
                      }}
                    >
                      <label className="block text-xs font-bold uppercase tracking-[0.14em] text-white/50">
                        Admin email
                      </label>
                      <input
                        type="email"
                        required
                        value={newAdminEmail}
                        onChange={(event) => setNewAdminEmail(event.target.value)}
                        placeholder="name@example.com"
                        className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-white/40"
                      />
                      <button
                        type="submit"
                        disabled={!newAdminEmail.trim() || addAdminMutation.isPending}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff4966] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#ff5f78] disabled:opacity-50"
                      >
                        {addAdminMutation.isPending ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />}
                        Add administrator
                      </button>
                    </form>
                    {addAdminMutation.isError && (
                      <p className="mt-4 rounded-xl bg-red-500/15 p-3 text-sm text-red-100">{(addAdminMutation.error as Error).message}</p>
                    )}
                  </aside>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
