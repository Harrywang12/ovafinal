"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, Trophy, Play, CheckCircle2, XCircle, ArrowRight, Video, Zap, Building2, Palmtree } from "lucide-react";
import { AuthGuard } from "../../components/auth-guard";
import { fadeInUp, staggerContainer, staggerItem, scaleIn } from "../../lib/animations";
import { useSupabaseAuth } from "../../lib/useSupabaseAuth";

type PracticeQuestion = {
  question_id: string;
  video_url: string;
  pause_at_seconds: number;
  options: string[];
  difficulty: "easy" | "medium" | "hard";
  answer_window_seconds: number;
};

const difficulties = ["easy", "medium", "hard"] as const;

const difficultyColors = {
  easy: "bg-green-500",
  medium: "bg-accent",
  hard: "bg-red-500",
};

export default function PracticePage() {
  const { session } = useSupabaseAuth();
  const [difficulty, setDifficulty] = useState<(typeof difficulties)[number]>("medium");
  const [videoCategory, setVideoCategory] = useState<"indoor" | "beach">("indoor");
  const [clip, setClip] = useState<PracticeQuestion | null>(null);
  const [phase, setPhase] = useState<"idle" | "question" | "resuming" | "done">("idle");
  const [timeLeftMs, setTimeLeftMs] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [evaluationResult, setEvaluationResult] = useState<{
    is_correct: boolean;
    correct_option_index: number;
    explanation: string | null;
    rule_reference: string | null;
  } | null>(null);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasPausedRef = useRef(false);
  const submittedRef = useRef(false);
  const questionStartMsRef = useRef<number | null>(null);

  const isAnswered = useMemo(() => evaluationResult !== null || evaluationError !== null, [evaluationResult, evaluationError]);

  const clipQuery = useQuery({
    queryKey: ["practice", difficulty, videoCategory],
    enabled: !!session?.access_token,
    queryFn: async () => {
      const res = await fetch(`/api/practice?difficulty=${difficulty}&category=${videoCategory}`, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("NO_VIDEOS");
        }
        throw new Error("Failed to load practice clip");
      }
      return res.json();
    },
  });

  useEffect(() => {
    if (clipQuery.data) {
      setClip(clipQuery.data);
      setPhase("idle");
      setTimeLeftMs(null);
      setSelectedIndex(null);
      setEvaluationResult(null);
      setEvaluationError(null);
      hasPausedRef.current = false;
      submittedRef.current = false;
      questionStartMsRef.current = null;

      const v = videoRef.current;
      if (v) {
        try {
          v.pause();
          v.currentTime = 0;
        } catch {
          // ignore
        }
      }
    }
  }, [clipQuery.data]);

  useEffect(() => {
    if (session?.access_token) {
      clipQuery.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, videoCategory, session?.access_token]);

  // Answer-window countdown (ms precision)
  useEffect(() => {
    if (!clip || phase !== "question") return;

    const totalMs = clip.answer_window_seconds * 1000;
    const start = performance.now();
    questionStartMsRef.current = start;
    setTimeLeftMs(totalMs);

    const interval = window.setInterval(() => {
      const elapsed = performance.now() - start;
      const remaining = Math.max(0, totalMs - elapsed);
      setTimeLeftMs(remaining);
      if (remaining <= 0) {
        window.clearInterval(interval);
      }
    }, 50);

    return () => window.clearInterval(interval);
  }, [clip, phase]);

  const attemptMutation = useMutation({
    mutationFn: async (payload: object) => {
      const res = await fetch("/api/practice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to evaluate ruling");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setEvaluationResult({
        is_correct: data.is_correct,
        correct_option_index: data.correct_option_index,
        explanation: data.explanation,
        rule_reference: data.rule_reference
      });
      setEvaluationError(null);

      // Resume playback after answering
      const v = videoRef.current;
      if (v) {
        v.play().catch(() => {
          // autoplay might be blocked; user can hit play
        });
      }
      setPhase("resuming");
    },
    onError: (error: Error) => {
      setEvaluationError(error.message);
    }
  });

  const maybePauseAtMarker = () => {
    const v = videoRef.current;
    if (!v || !clip) return;
    if (hasPausedRef.current) return;
    if (v.currentTime >= clip.pause_at_seconds) {
      hasPausedRef.current = true;
      try {
        v.pause();
        v.currentTime = clip.pause_at_seconds;
      } catch {
        // ignore
      }
      setPhase("question");
    }
  };

  // Auto-submit on timeout
  useEffect(() => {
    if (!clip || phase !== "question") return;
    if (timeLeftMs === null) return;
    if (timeLeftMs > 0) return;
    if (submittedRef.current) return;

    submittedRef.current = true;
    setEvaluationError(null);
    attemptMutation.mutate({
      question_id: clip.question_id,
      selected_option_index: null,
      timed_out: true,
      time_taken_ms: clip.answer_window_seconds * 1000,
    });
  }, [clip, phase, timeLeftMs, attemptMutation, session?.user?.id]);

  const submitSelection = (idx: number) => {
    if (!clip) return;
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSelectedIndex(idx);
    setEvaluationError(null);

    const started = questionStartMsRef.current;
    const timeTakenMs = started ? Math.max(0, Math.floor(performance.now() - started)) : undefined;

    attemptMutation.mutate({
      question_id: clip.question_id,
      selected_option_index: idx,
      timed_out: false,
      time_taken_ms: timeTakenMs,
    });
  };

  return (
    <AuthGuard>
      <div className="min-h-screen pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-6">
          {/* Header Section */}
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="text-center mb-12"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 text-accent mb-6"
            >
              <Video size={32} />
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-primary mb-4">
              Video Practice
            </h1>
            <p className="text-muted text-lg max-w-xl mx-auto mb-6">
              Real game footage with timed decisions. Train your instincts at match speed.
            </p>

            {/* Indoor / Beach Toggle */}
            <div className="inline-flex items-center rounded-full bg-white border border-border shadow-sm p-1 gap-1">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setVideoCategory("indoor")}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                  videoCategory === "indoor"
                    ? "bg-primary text-white shadow-md"
                    : "text-muted hover:text-ink"
                }`}
              >
                <Building2 size={16} />
                Indoor
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setVideoCategory("beach")}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                  videoCategory === "beach"
                    ? "bg-cyan-500 text-white shadow-md"
                    : "text-muted hover:text-ink"
                }`}
              >
                <Palmtree size={16} />
                Beach
              </motion.button>
            </div>
          </motion.div>

          {/* Difficulty Selector & New Clip */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex flex-wrap items-center justify-center gap-3 mb-10"
          >
            {difficulties.map((d) => (
              <motion.button
                key={d}
                variants={staggerItem}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setDifficulty(d)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold capitalize transition-all ${
                  difficulty === d
                    ? `${difficultyColors[d]} text-white shadow-lg`
                    : "bg-white border border-border text-ink hover:border-accent/40"
                }`}
              >
                {d}
              </motion.button>
            ))}
            <motion.button
              variants={staggerItem}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => clipQuery.refetch()}
              disabled={clipQuery.isLoading}
              className="pill text-white"
            >
              {clipQuery.isLoading ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Zap size={18} />
                  </motion.span>
                  Loading...
                </>
              ) : (
                <>
                  <Play size={18} />
                  New Clip
                </>
              )}
            </motion.button>
          </motion.div>

          {/* Feature Cards */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-3 gap-4 mb-10"
          >
            {[
              { icon: Timer, title: "Timed", desc: "Rally pressure" },
              { icon: Trophy, title: "Grounded", desc: "Rule cited" },
              { icon: Video, title: "Tracked", desc: "Results saved" },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={staggerItem}
                className="card text-center py-4"
              >
                <item.icon size={20} className="mx-auto text-accent mb-2" />
                <p className="text-sm font-semibold text-primary">{item.title}</p>
                <p className="text-xs text-muted">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Video Card */}
          <AnimatePresence mode="wait">
            {clip ? (
              <motion.div
                key={clip.question_id}
                variants={scaleIn}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, scale: 0.95 }}
                className="card space-y-6"
              >
                {/* Timer (answer window) */}
                {phase === "question" && timeLeftMs !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                      Time to decide
                    </span>
                    <motion.div
                      animate={timeLeftMs <= 2000 ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 0.5, repeat: timeLeftMs <= 2000 ? Infinity : 0 }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold ${
                        timeLeftMs <= 2000
                          ? "bg-red-100 text-red-600"
                          : "bg-surface text-primary"
                      }`}
                    >
                      <Timer size={18} />
                      {Math.ceil(timeLeftMs / 1000)}s
                    </motion.div>
                  </div>
                )}

                {/* Video Player */}
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                  <video
                    src={clip.video_url}
                    className="w-full h-full object-cover"
                    controls
                    preload="metadata"
                    ref={videoRef}
                    onTimeUpdate={maybePauseAtMarker}
                    onSeeked={maybePauseAtMarker}
                    onEnded={() => setPhase("done")}
                  />
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${difficultyColors[difficulty]}`}>
                      {difficulty}
                    </span>
                  </div>
                  {phase === "question" && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="px-4 py-2 rounded-full bg-white/90 text-ink font-semibold">
                        Paused — make your call
                      </span>
                    </div>
                  )}
                </div>

                {/* Options */}
                {phase === "question" && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-primary">What is the correct call?</p>
                    <div className="grid gap-3">
                      {clip.options.map((opt, idx) => {
                        const isPicked = selectedIndex === idx;
                        return (
                          <motion.button
                            key={idx}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => submitSelection(idx)}
                            disabled={attemptMutation.isPending || submittedRef.current}
                            className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                              isPicked
                                ? "border-accent bg-accent/10 text-ink"
                                : "border-border bg-white hover:border-accent/40"
                            } disabled:opacity-60 disabled:cursor-not-allowed`}
                          >
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Option {idx + 1}</span>
                            <p className="text-ink font-semibold mt-1">{opt}</p>
                          </motion.button>
                        );
                      })}
                    </div>
                    {attemptMutation.isPending && (
                      <div className="flex items-center gap-2 text-sm text-muted">
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Zap size={16} />
                        </motion.span>
                        Saving…
                      </div>
                    )}
                  </div>
                )}

                {/* Result */}
                {isAnswered && (
                  <div className="space-y-4">
                    {evaluationError && (
                      <div className="p-4 rounded-xl bg-red-100 border border-red-200">
                        <div className="flex items-center gap-3">
                          <XCircle className="text-red-600" size={24} />
                          <div>
                            <p className="font-bold text-lg text-red-700">Submission Error</p>
                            <p className="text-sm text-red-600 mt-1">{evaluationError}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {evaluationResult && (
                      <>
                        <div className={`p-4 rounded-xl ${
                          evaluationResult.is_correct
                            ? "bg-green-100 border border-green-200"
                            : "bg-red-100 border border-red-200"
                        }`}>
                          <div className="flex items-center gap-3">
                            {evaluationResult.is_correct ? (
                              <CheckCircle2 className="text-green-600" size={24} />
                            ) : (
                              <XCircle className="text-red-600" size={24} />
                            )}
                            <div>
                              <span className={`font-bold text-lg ${
                                evaluationResult.is_correct ? "text-green-700" : "text-red-700"
                              }`}>
                                {evaluationResult.is_correct ? "Correct Decision!" : "Incorrect Decision"}
                              </span>
                              <p className="text-xs text-muted mt-1">
                                Correct option: #{evaluationResult.correct_option_index + 1}
                              </p>
                            </div>
                          </div>
                        </div>

                        {(evaluationResult.explanation || evaluationResult.rule_reference) && (
                          <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
                            {evaluationResult.explanation && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                                  Explanation
                                </p>
                                <p className="text-ink">{evaluationResult.explanation}</p>
                              </div>
                            )}
                            {evaluationResult.rule_reference && (
                              <p className="text-sm text-accent font-medium">
                                📖 Rule: {evaluationResult.rule_reference}
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Next Clip Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => clipQuery.refetch()}
                  className="pill text-white w-full justify-center"
                >
                  Next Clip
                  <ArrowRight size={18} />
                </motion.button>
              </motion.div>
            ) : clipQuery.error?.message === "NO_VIDEOS" ? (
              <motion.div
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                className="card text-center py-16"
              >
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-green-100 text-green-600 mb-6"
                >
                  <CheckCircle2 size={40} />
                </motion.div>
                <h3 className="text-xl font-display font-bold text-primary mb-2">
                  🎉 You&apos;ve Finished All Practice Clips!
                </h3>
                <p className="text-muted mb-4">
                  Great job completing all the {difficulty} difficulty practice clips. 
                  Try a different difficulty level or check back later for new content.
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  {difficulties.map((d) => (
                    <motion.button
                      key={d}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setDifficulty(d)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold capitalize transition-all ${
                        difficulty === d
                          ? `${difficultyColors[d]} text-white shadow-lg`
                          : "bg-white border border-border text-ink hover:border-accent/40"
                      }`}
                    >
                      {d}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                className="card text-center py-16"
              >
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-accent/10 text-accent mb-6"
                >
                  <Video size={40} />
                </motion.div>
                <h3 className="text-xl font-display font-bold text-primary mb-2">
                  Ready for Game Speed?
                </h3>
                <p className="text-muted mb-6">
                  Load a clip to practice making quick decisions under pressure.
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => clipQuery.refetch()}
                  disabled={clipQuery.isLoading}
                  className="pill text-white disabled:opacity-50"
                >
                  {clipQuery.isLoading ? (
                    <>
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Zap size={18} />
                      </motion.span>
                      Loading...
                    </>
                  ) : (
                    <>
                      <Play size={18} />
                      Load Clip
                    </>
                  )}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AuthGuard>
  );
}
