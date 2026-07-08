"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Upload, Video, Save, Shield, Loader2 } from "lucide-react";
import { AuthGuard } from "../../../components/auth-guard";
import { useSupabaseAuth } from "../../../lib/useSupabaseAuth";
import { useAdminAccess } from "../../../lib/useAdminAccess";
import { fadeInUp, scaleIn } from "../../../lib/animations";

type Difficulty = "easy" | "medium" | "hard";

export default function NewVideoQuestionPage() {
  const { session } = useSupabaseAuth();
  const adminAccess = useAdminAccess(session);
  const isAdmin = adminAccess.data?.isAdmin === true;

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [kind, setKind] = useState<"practice" | "challenge">("practice");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [category, setCategory] = useState<"indoor" | "beach">("indoor");
  const [pauseAtSeconds, setPauseAtSeconds] = useState<number>(6);
  const [answerWindowSeconds, setAnswerWindowSeconds] = useState<number>(15);
  const [isWeekly, setIsWeekly] = useState<boolean>(false);

  const [videoUrl, setVideoUrl] = useState<string>("");
  const [videoFileName, setVideoFileName] = useState<string>("");

  const [options, setOptions] = useState<[string, string, string, string]>(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState<0 | 1 | 2 | 3>(0);
  const [explanation, setExplanation] = useState<string>("");
  const [ruleReference, setRuleReference] = useState<string>("");

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload-video", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session!.access_token}`,
        },
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }
      return res.json() as Promise<{ publicUrl: string; path: string; bucket: string }>;
    },
    onSuccess: (data) => {
      setVideoUrl(data.publicUrl);
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!videoUrl) throw new Error("Please upload a video (or provide a URL)");
      if (!pauseAtSeconds || pauseAtSeconds <= 0) throw new Error("pauseAtSeconds must be > 0");
      if (!answerWindowSeconds || answerWindowSeconds < 3 || answerWindowSeconds > 300) {
        throw new Error("Answer window must be between 3 and 300 seconds");
      }
      if (options.some((o) => !o.trim())) throw new Error("All 4 options are required");

      const res = await fetch("/api/admin/video-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session!.access_token}`,
        },
        body: JSON.stringify({
          kind,
          difficulty,
          category,
          video_url: videoUrl,
          pause_at_seconds: pauseAtSeconds,
          answer_window_seconds: answerWindowSeconds,
          options,
          correct_option_index: correctIndex,
          explanation: explanation || undefined,
          rule_reference: ruleReference || undefined,
          is_weekly: kind === "challenge" ? isWeekly : false,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create");
      }

      return res.json();
    },
  });

  return (
    <AuthGuard>
      <div className="min-h-screen pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="text-center mb-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-6"
            >
              <Shield size={32} />
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-primary mb-3">New Video Challenge</h1>
            <p className="text-muted text-lg max-w-2xl mx-auto">Upload a clip, set the pause point, provide 4 options, and choose the correct answer.</p>
          </motion.div>

          {adminAccess.isLoading ? (
            <motion.div variants={scaleIn} initial="hidden" animate="visible" className="card text-center py-10">
              <Loader2 className="mx-auto animate-spin text-primary" size={24} />
              <p className="text-muted mt-3">Checking admin access…</p>
            </motion.div>
          ) : !isAdmin ? (
            <motion.div variants={scaleIn} initial="hidden" animate="visible" className="card text-center py-10">
              <p className="text-primary font-semibold">Admin access required</p>
              <p className="text-muted mt-2">Ask an existing administrator to add your email.</p>
              <div className="mt-6">
                <Link href="/" className="pill text-white inline-flex">
                  <ArrowLeft size={18} />
                  Back Home
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div variants={scaleIn} initial="hidden" animate="visible" className="card space-y-6">
              <div className="flex items-center justify-between gap-3">
                <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:opacity-80">
                  <ArrowLeft size={16} />
                  Back to Admin
                </Link>
              </div>

              {/* Basics */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Type</label>
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value as "practice" | "challenge")}
                    className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                  >
                    <option value="practice">Practice</option>
                    <option value="challenge">Challenge</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as "indoor" | "beach")}
                    className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                  >
                    <option value="indoor">🏐 Indoor</option>
                    <option value="beach">🏖️ Beach</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                    className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Pause at (seconds)</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={pauseAtSeconds}
                    onChange={(e) => setPauseAtSeconds(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Answer window (seconds)</label>
                  <input
                    type="number"
                    min={3}
                    max={300}
                    step={1}
                    value={answerWindowSeconds}
                    onChange={(e) => setAnswerWindowSeconds(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                  <p className="text-xs text-muted mt-1">How long users get to pick an answer once the video pauses.</p>
                </div>
              </div>

              {kind === "challenge" && (
                <div className="flex items-center gap-3">
                  <input
                    id="weekly"
                    type="checkbox"
                    checked={isWeekly}
                    onChange={(e) => setIsWeekly(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <label htmlFor="weekly" className="text-sm text-ink">
                    Mark as weekly challenge (shown on /challenge)
                  </label>
                </div>
              )}

              {/* Video Upload */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-primary">Video</p>
                    <p className="text-xs text-muted">Uploads to Supabase Storage bucket: <span className="font-semibold">practice-clips</span></p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setVideoFileName(file.name);
                      uploadMutation.mutate(file);
                    }}
                  />

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => fileInputRef.current?.click()}
                    className="pill text-white"
                    disabled={uploadMutation.isPending}
                    type="button"
                  >
                    {uploadMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                    {uploadMutation.isPending ? "Uploading…" : "Upload Video"}
                  </motion.button>

                  <div className="flex-1 min-w-[240px]">
                    <input
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="Or paste a public video URL"
                      className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                    {videoFileName && (
                      <p className="text-xs text-muted mt-1">Selected: {videoFileName}</p>
                    )}
                  </div>
                </div>

                {uploadMutation.isError && (
                  <div className="p-3 rounded-xl bg-red-100 border border-red-200">
                    <p className="text-sm text-red-700">{(uploadMutation.error as Error).message}</p>
                  </div>
                )}

                {videoUrl && (
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                    <video src={videoUrl} controls className="w-full h-full object-cover" />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold text-white bg-accent">Preview</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-primary">Answer Options</p>
                    <p className="text-xs text-muted">Exactly 4 options. Select which one is correct.</p>
                  </div>
                </div>

                <div className="grid gap-3">
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="correct"
                        checked={correctIndex === idx}
                        onChange={() => setCorrectIndex(idx as 0 | 1 | 2 | 3)}
                      />
                      <input
                        value={opt}
                        onChange={(e) => {
                          const next = [...options] as [string, string, string, string];
                          next[idx] = e.target.value;
                          setOptions(next);
                        }}
                        placeholder={`Option ${idx + 1}`}
                        className="flex-1 px-4 py-3 rounded-xl bg-surface border border-border text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Explanation / Rule */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Rule reference (optional)</label>
                  <input
                    value={ruleReference}
                    onChange={(e) => setRuleReference(e.target.value)}
                    placeholder="e.g., Rule 8.4"
                    className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Explanation (optional)</label>
                  <input
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="Short rationale shown after answer"
                    className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
              </div>

              <AnimatePresence>
                {createMutation.isError && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-3 rounded-xl bg-red-100 border border-red-200">
                    <p className="text-sm text-red-700">{(createMutation.error as Error).message}</p>
                  </motion.div>
                )}
                {createMutation.isSuccess && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-3 rounded-xl bg-green-100 border border-green-200">
                    <p className="text-sm text-green-700">Created! Go back to Admin to see it listed.</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-between gap-3">
                <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary">
                  <ArrowLeft size={16} />
                  Cancel
                </Link>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending}
                  className="pill text-white"
                  type="button"
                >
                  {createMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {createMutation.isPending ? "Saving…" : "Create"}
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
