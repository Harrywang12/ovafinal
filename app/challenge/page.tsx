"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, RefreshCcw, Medal, Crown, Send, Loader2, Video, Timer, CheckCircle2, XCircle, Palmtree, Building2 } from "lucide-react";
import { AuthGuard } from "../../components/auth-guard";
import { fadeInUp, staggerContainer, staggerItem, scaleIn } from "../../lib/animations";
import { useSupabaseAuth } from "../../lib/useSupabaseAuth";

const rankColors = [
  "from-yellow-400 to-amber-500", // Gold
  "from-gray-300 to-gray-400",     // Silver
  "from-amber-600 to-amber-700",   // Bronze
];

const rankIcons = [Crown, Medal, Medal];

export default function ChallengePage() {
  const { session } = useSupabaseAuth();
  const [phase, setPhase] = useState<"idle" | "question" | "resuming" | "done">("idle");
  const [timeLeftMs, setTimeLeftMs] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [evaluationResult, setEvaluationResult] = useState<{
    is_correct: boolean;
    correct_option_index: number;
    explanation: string | null;
    rule_reference: string | null;
    score: number;
  } | null>(null);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [videoCategory, setVideoCategory] = useState<"indoor" | "beach">("indoor");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasPausedRef = useRef(false);
  const submittedRef = useRef(false);
  const questionStartMsRef = useRef<number | null>(null);

  const isAnswered = useMemo(() => evaluationResult !== null || evaluationError !== null, [evaluationResult, evaluationError]);

  const challengeQuery = useQuery({
    queryKey: ["challenge", videoCategory],
    enabled: !!session?.access_token,
    queryFn: async () => {
      const res = await fetch(`/api/challenge?category=${videoCategory}`, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to load challenge");
      return res.json();
    }
  });

  useEffect(() => {
    if (challengeQuery.data?.question) {
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
  }, [challengeQuery.data?.question?.id]);

  // Answer-window countdown (ms precision)
  useEffect(() => {
    const q = challengeQuery.data?.question;
    if (!q || phase !== "question") return;

    const totalMs = (q.answer_window_seconds as number) * 1000;
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
  }, [challengeQuery.data?.question, phase]);

  const submitMutation = useMutation({
    mutationFn: async (payload: object) => {
      const res = await fetch("/api/challenge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to submit");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setEvaluationResult({
        is_correct: data.is_correct,
        correct_option_index: data.correct_option_index,
        explanation: data.explanation,
        rule_reference: data.rule_reference,
        score: data.score
      });
      setEvaluationError(null);

      const v = videoRef.current;
      if (v) {
        v.play().catch(() => {
          // autoplay may be blocked
        });
      }
      setPhase("resuming");

      // Refresh leaderboard after successful submission
      challengeQuery.refetch();
    },
    onError: (error: Error) => {
      setEvaluationError(error.message);
    }
  });

  const question = challengeQuery.data?.question;
  const leaderboard = challengeQuery.data?.leaderboard || [];
  const alreadyAttempted = challengeQuery.data?.already_attempted === true;

  const maybePauseAtMarker = () => {
    const v = videoRef.current;
    if (!v || !question) return;
    if (hasPausedRef.current) return;
    if (v.currentTime >= question.pause_at_seconds) {
      hasPausedRef.current = true;
      try {
        v.pause();
        v.currentTime = question.pause_at_seconds;
      } catch {
        // ignore
      }
      setPhase("question");
    }
  };

  useEffect(() => {
    if (!question || phase !== "question") return;
    if (timeLeftMs === null) return;
    if (timeLeftMs > 0) return;
    if (submittedRef.current) return;

    submittedRef.current = true;
    setEvaluationError(null);
    submitMutation.mutate({
      question_id: question.id,
      selected_option_index: null,
      timed_out: true,
      time_taken_ms: question.answer_window_seconds * 1000,
    });
  }, [question, phase, timeLeftMs, submitMutation, session?.user?.id]);

  const submitSelection = (idx: number) => {
    if (!question) return;
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSelectedIndex(idx);
    setEvaluationError(null);

    const started = questionStartMsRef.current;
    const timeTakenMs = started ? Math.max(0, Math.floor(performance.now() - started)) : undefined;

    submitMutation.mutate({
      question_id: question.id,
      selected_option_index: idx,
      timed_out: false,
      time_taken_ms: timeTakenMs,
    });
  };

  return (
    <AuthGuard>
      <div className="min-h-screen pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-6">
          {/* Header Section */}
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="text-center mb-12"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 text-white mb-6 shadow-lg"
            >
              <Trophy size={32} />
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-primary mb-4">
              Weekly Challenge
            </h1>
            <p className="text-muted text-lg max-w-xl mx-auto mb-6">
              One brutal rally per week. Submit your ruling, climb the leaderboard, claim bragging rights.
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

          {/* Refresh Button */}
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="flex justify-center mb-10"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => challengeQuery.refetch()}
              disabled={challengeQuery.isLoading}
              className="pill text-white"
            >
              {challengeQuery.isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCcw size={18} />
                  Refresh Challenge
                </>
              )}
            </motion.button>
          </motion.div>

          <div className="grid lg:grid-cols-5 gap-6">
            {/* Video - 3 cols */}
            <div className="lg:col-span-3 space-y-6">
              {/* Video Card */}
              <motion.div
                variants={scaleIn}
                initial="hidden"
                animate="visible"
                className="card"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Video className="text-accent" size={24} />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                      This Week&apos;s Challenge
                    </p>
                    <h3 className="text-lg font-display font-bold text-primary">
                      {question ? `${question.difficulty[0].toUpperCase()}${question.difficulty.slice(1)} Clip` : "Weekly Clip"}
                    </h3>
                  </div>
                </div>
                
                {question ? (
                  <div className="space-y-4">
                    {/* Timer */}
                    {phase === "question" && timeLeftMs !== null && !evaluationResult && (
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
                    <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                      <video
                        src={question.video_url}
                        className="w-full h-full object-cover"
                        controls
                        ref={videoRef}
                        onTimeUpdate={maybePauseAtMarker}
                        onSeeked={maybePauseAtMarker}
                        onEnded={() => setPhase("done")}
                      />
                      <div className="absolute top-4 left-4">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold text-white bg-accent">
                          Challenge
                        </span>
                      </div>
                      {phase === "question" && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="px-4 py-2 rounded-full bg-white/90 text-ink font-semibold">
                            Paused — choose an option
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted">
                      Pause point: <span className="font-semibold">{question.pause_at_seconds}s</span> · Difficulty:{" "}
                      <span className="font-semibold capitalize">{question.difficulty}</span>
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface text-muted mb-4"
                    >
                      <Video size={32} />
                    </motion.div>
                    <p className="text-muted">
                      {alreadyAttempted ? "You already completed this week's challenge." : "No challenge video this week"}
                    </p>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Options & Leaderboard - 2 cols, beside the video */}
            <div className="lg:col-span-2 space-y-6">
              {/* Submit Card */}
              <motion.div
                variants={scaleIn}
                initial="hidden"
                animate="visible"
                className="card"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Send className="text-accent" size={24} />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                      Your Submission
                    </p>
                    <h3 className="text-lg font-display font-bold text-primary">
                      {evaluationResult ? "Your Result" : "Submit Ruling"}
                    </h3>
                  </div>
                </div>
                
                {!evaluationResult ? (
                  <div className="space-y-4">
                    {!question ? (
                      <p className="text-muted">No weekly challenge is configured yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {phase !== "question" && (
                          <div className="p-4 rounded-xl bg-surface border border-border">
                            <p className="text-primary font-semibold">Read the options while you watch.</p>
                            <p className="text-muted text-sm mt-1">
                              The video pauses at {question.pause_at_seconds}s — then you’ll have {question.answer_window_seconds}s to lock in your answer.
                            </p>
                          </div>
                        )}
                        <p className="text-sm font-semibold text-primary">
                          {phase === "question" ? "Choose the correct option" : "Answer options"}
                        </p>
                        <div className="grid gap-3">
                          {question.options.map((opt: string, idx: number) => {
                            const isPicked = selectedIndex === idx;
                            const locked = phase !== "question";
                            return (
                              <motion.button
                                key={idx}
                                whileHover={!locked ? { scale: 1.01 } : {}}
                                whileTap={!locked ? { scale: 0.99 } : {}}
                                onClick={() => submitSelection(idx)}
                                disabled={locked || submitMutation.isPending || submittedRef.current}
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
                        {phase === "question" && (
                          <p className="text-xs text-muted">
                            Time window: {question.answer_window_seconds}s
                          </p>
                        )}
                      </div>
                    )}

                    {evaluationError && (
                      <div className="p-3 rounded-xl bg-red-100 border border-red-200">
                        <p className="text-sm text-red-700">{evaluationError}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Result Banner */}
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
                          <p className="text-sm font-bold text-primary mt-1">
                            Score: {evaluationResult.score} points
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Explanation */}
                    <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                          Correct Option
                        </p>
                        <p className="text-ink">#{evaluationResult.correct_option_index + 1}</p>
                      </div>
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

                    {/* Reset Button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setEvaluationResult(null);
                        setEvaluationError(null);
                        setSelectedIndex(null);
                        setTimeLeftMs(null);
                        submittedRef.current = false;
                        hasPausedRef.current = false;
                        setPhase("idle");

                        const v = videoRef.current;
                        if (v) {
                          try {
                            v.pause();
                            v.currentTime = 0;
                          } catch {
                            // ignore
                          }
                        }
                      }}
                      className="pill text-white w-full justify-center"
                    >
                      <RefreshCcw size={18} />
                      Try Again
                    </motion.button>
                  </div>
                )}
              </motion.div>

            {/* Leaderboard */}
            <motion.div
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              className="card h-fit"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-white">
                  <Trophy size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Rankings
                  </p>
                  <h3 className="text-lg font-display font-bold text-primary">
                    Leaderboard
                  </h3>
                </div>
              </div>
              
              <AnimatePresence mode="wait">
                {leaderboard.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center py-8"
                  >
                    <p className="text-muted">No entries this week</p>
                    <p className="text-sm text-muted mt-1">Be the first to submit!</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="leaderboard"
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="space-y-3"
                  >
                    {leaderboard.map((entry: { user_id?: string; best_score: number }, idx: number) => {
                      const isTopThree = idx < 3;
                      const RankIcon = rankIcons[idx] || null;
                      
                      return (
                        <motion.div
                          key={idx}
                          variants={staggerItem}
                          className={`flex items-center justify-between p-3 rounded-xl border ${
                            isTopThree
                              ? "border-accent/30 bg-accent/5"
                              : "border-border bg-surface"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {isTopThree ? (
                              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${rankColors[idx]} flex items-center justify-center text-white shadow-sm`}>
                                {RankIcon && <RankIcon size={16} />}
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-muted font-bold text-sm">
                                {idx + 1}
                              </div>
                            )}
                            <div>
                              <p className={`font-semibold ${isTopThree ? "text-primary" : "text-ink"}`}>
                                {entry.user_id ?? "Anonymous"}
                              </p>
                              {isTopThree && (
                                <p className="text-xs text-muted">
                                  {idx === 0 ? "Champion" : idx === 1 ? "Runner-up" : "Third Place"}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className={`text-lg font-bold ${isTopThree ? "text-accent" : "text-primary"}`}>
                            {entry.best_score}
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
