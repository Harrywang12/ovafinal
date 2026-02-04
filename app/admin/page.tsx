"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Shield, Trash2, RefreshCcw, Video } from "lucide-react";
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
  created_at: string;
};

const ADMIN_EMAIL = "yixuanwang2009@gmail.com";

export default function AdminPage() {
  const { session } = useSupabaseAuth();
  const [kindFilter, setKindFilter] = useState<"all" | "practice" | "challenge">("all");

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
                <div className="flex items-center gap-2">
                  {(["all", "practice", "challenge"] as const).map((k) => (
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
                    onClick={() => listQuery.refetch()}
                    className="pill text-white"
                    disabled={listQuery.isLoading}
                  >
                    <RefreshCcw size={18} />
                    Refresh
                  </motion.button>
                  <Link className="pill text-white" href="/admin/new">
                    <Plus size={18} />
                    New Video Challenge
                  </Link>
                </div>
              </motion.div>

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
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
