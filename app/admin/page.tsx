"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Shield, Trash2, RefreshCcw, Video, GraduationCap, BarChart3 } from "lucide-react";
import { AuthGuard } from "../../components/auth-guard";
import { useSupabaseAuth } from "../../lib/useSupabaseAuth";
import { fadeInUp, scaleIn, staggerContainer, staggerItem } from "../../lib/animations";

type VideoQuestionRow = {
  id: string;
  kind: "practice" | "challenge";
  difficulty: "easy" | "medium" | "hard";
  video_url: string;
  pause_at_seconds: number;
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

const ADMIN_EMAIL = "yixuanwang2009@gmail.com";

export default function AdminPage() {
  const { session } = useSupabaseAuth();
  const [kindFilter, setKindFilter] = useState<"all" | "practice" | "challenge">("all");
  const [activePanel, setActivePanel] = useState<"videos" | "learning">("videos");
  const [selectedLearnerIds, setSelectedLearnerIds] = useState<string[]>([]);
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  const [quizQuota, setQuizQuota] = useState<number>(50);
  const [quizRequiredPercent, setQuizRequiredPercent] = useState<number>(70);

  const isAdmin = useMemo(() => {
    const email = session?.user?.email?.toLowerCase() || "";
    return email === ADMIN_EMAIL.toLowerCase();
  }, [session?.user?.email]);

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

  const toggleSelected = (value: string, current: string[], setValue: (next: string[]) => void) => {
    setValue(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  const refLevelLabel = (level: LearningProgressRow["referee_level"]) => `Level ${level.replace("level_", "")}`;
  const quizProgressByUser = useMemo(() => {
    return new Map((quizAssignmentQuery.data?.learners || []).map((learner) => [learner.user_id, learner.quiz_assignment]));
  }, [quizAssignmentQuery.data?.learners]);

  return (
    <AuthGuard>
      <div className="min-h-screen pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="text-center mb-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-6"
            >
              <Shield size={32} />
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-primary mb-3">Admin Panel</h1>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              Upload and configure video challenges: pause point, 4 options, correct answer, and difficulty-based answer window.
            </p>
          </motion.div>

          {!isAdmin ? (
            <motion.div variants={scaleIn} initial="hidden" animate="visible" className="card text-center py-10">
              <p className="text-primary font-semibold">Admin access required</p>
              <p className="text-muted mt-2">Sign in as {ADMIN_EMAIL} to manage challenges.</p>
            </motion.div>
          ) : (
            <>
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="flex flex-wrap items-center justify-between gap-3 mb-6"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {(["videos", "learning"] as const).map((panel) => (
                    <motion.button
                      key={panel}
                      variants={staggerItem}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActivePanel(panel)}
                      className={
                        activePanel === panel
                          ? "px-4 py-2 rounded-full text-sm font-semibold bg-primary text-white inline-flex items-center gap-2"
                          : "px-4 py-2 rounded-full text-sm font-semibold bg-white border border-border text-ink hover:border-primary/40 inline-flex items-center gap-2"
                      }
                    >
                      {panel === "videos" ? <Video size={16} /> : <GraduationCap size={16} />}
                      {panel === "videos" ? "Video Questions" : "Learning Progress"}
                    </motion.button>
                  ))}
                  {activePanel === "videos" && (["all", "practice", "challenge"] as const).map((k) => (
                    <motion.button
                      key={k}
                      variants={staggerItem}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setKindFilter(k)}
                      className={
                        kindFilter === k
                          ? "px-4 py-2 rounded-full text-sm font-semibold bg-accent text-white"
                          : "px-4 py-2 rounded-full text-sm font-semibold bg-white border border-border text-ink hover:border-accent/40"
                      }
                    >
                      {k === "all" ? "All" : k[0].toUpperCase() + k.slice(1)}
                    </motion.button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <motion.button
                    variants={staggerItem}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => activePanel === "videos" ? listQuery.refetch() : (learningQuery.refetch(), assignmentQuery.refetch(), quizAssignmentQuery.refetch())}
                    className="pill text-white"
                    disabled={activePanel === "videos" ? listQuery.isLoading : learningQuery.isLoading}
                  >
                    <RefreshCcw size={18} />
                    Refresh
                  </motion.button>
                  {activePanel === "videos" && (
                    <Link className="pill text-white" href="/admin/new">
                      <Plus size={18} />
                      New Video Challenge
                    </Link>
                  )}
                </div>
              </motion.div>

              {activePanel === "videos" ? (
              <motion.div variants={scaleIn} initial="hidden" animate="visible" className="card">
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
              ) : (
              <motion.div variants={scaleIn} initial="hidden" animate="visible" className="card">
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
              )}
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
