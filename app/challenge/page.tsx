"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, RefreshCcw, Medal, Crown, Send, Loader2, Video, Timer, CheckCircle2, XCircle } from "lucide-react";
import { AuthGuard } from "../../components/auth-guard";
import { fadeInUp, staggerContainer, staggerItem, scaleIn } from "../../lib/animations";

const rankColors = [
  "from-yellow-400 to-amber-500", // Gold
  "from-gray-300 to-gray-400",     // Silver
  "from-amber-600 to-amber-700",   // Bronze
];

const rankIcons = [Crown, Medal, Medal];

export default function ChallengePage() {
  const [userAnswer, setUserAnswer] = useState("");
  const [userId, setUserId] = useState("");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timeTaken, setTimeTaken] = useState<number | null>(null);
  const [evaluationResult, setEvaluationResult] = useState<{
    is_correct: boolean;
    normalized_call: string;
    explanation: string;
    rule_reference: string;
    score: number;
  } | null>(null);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);

  const challengeQuery = useQuery({
    queryKey: ["challenge"],
    queryFn: async () => {
      const res = await fetch("/api/challenge");
      if (!res.ok) throw new Error("Failed to load challenge");
      return res.json();
    }
  });

  // Initialize timer when video loads (extreme difficulty = 6 seconds)
  useEffect(() => {
    if (challengeQuery.data?.video && !evaluationResult) {
      setTimeLeft(6);
      setTimeTaken(null);
      setUserAnswer("");
      setEvaluationResult(null);
      setEvaluationError(null);
    }
  }, [challengeQuery.data?.video?.id, evaluationResult]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || evaluationResult) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft, evaluationResult]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!userAnswer.trim()) {
        throw new Error("Please enter your ruling before submitting");
      }
      
      const res = await fetch("/api/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId || undefined,
          video_id: challengeQuery.data?.video?.id,
          userAnswer: userAnswer.trim(),
          time_taken: timeTaken !== null ? timeTaken : (timeLeft !== null ? 6 - timeLeft : undefined)
        })
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
        normalized_call: data.normalized_call,
        explanation: data.explanation,
        rule_reference: data.rule_reference,
        score: data.score
      });
      setEvaluationError(null);
      if (timeLeft !== null) {
        setTimeTaken(6 - timeLeft);
      }
      // Refresh leaderboard after successful submission
      challengeQuery.refetch();
    },
    onError: (error: Error) => {
      setEvaluationError(error.message);
    }
  });

  const video = challengeQuery.data?.video;
  const leaderboard = challengeQuery.data?.leaderboard || [];

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
            <p className="text-muted text-lg max-w-xl mx-auto">
              One brutal rally per week. Submit your ruling, climb the leaderboard, claim bragging rights.
            </p>
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
            {/* Video & Submit - 3 cols */}
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
                      Extreme Clip
                    </h3>
                  </div>
                </div>
                
                {video ? (
                  <div className="space-y-4">
                    {/* Timer */}
                    {timeLeft !== null && !evaluationResult && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                          Time to decide
                        </span>
                        <motion.div
                          animate={timeLeft <= 2 ? { scale: [1, 1.1, 1] } : {}}
                          transition={{ duration: 0.5, repeat: timeLeft <= 2 ? Infinity : 0 }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold ${
                            timeLeft <= 2
                              ? "bg-red-100 text-red-600"
                              : "bg-surface text-primary"
                          }`}
                        >
                          <Timer size={18} />
                          {timeLeft}s
                        </motion.div>
                      </div>
                    )}
                    <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                      <video
                        src={video.video_url}
                        className="w-full h-full object-cover"
                        controls
                      />
                      <div className="absolute top-4 left-4">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold text-white bg-accent">
                          Challenge
                        </span>
                      </div>
                    </div>
                    {video.rule_reference && !evaluationResult && (
                      <p className="text-sm text-muted">
                        📖 Rule: {video.rule_reference}
                      </p>
                    )}
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
                    <p className="text-muted">No challenge video this week</p>
                  </div>
                )}
              </motion.div>

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
                  <>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-muted mb-2">
                          User ID (Optional)
                        </label>
                        <input
                          value={userId}
                          onChange={(e) => setUserId(e.target.value)}
                          placeholder="Your name"
                          className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted mb-2">
                          Your Ruling <span className="text-red-500">*</span>
                        </label>
                        <input
                          value={userAnswer}
                          onChange={(e) => setUserAnswer(e.target.value)}
                          placeholder="e.g., Fault: Net touch on blocker"
                          className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                        />
                      </div>
                    </div>
                    
                    {evaluationError && (
                      <div className="mt-4 p-3 rounded-xl bg-red-100 border border-red-200">
                        <p className="text-sm text-red-700">{evaluationError}</p>
                      </div>
                    )}
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => submitMutation.mutate()}
                      disabled={submitMutation.isPending || !video || !userAnswer.trim()}
                      className="pill text-white w-full justify-center mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitMutation.isPending ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Evaluating...
                        </>
                      ) : (
                        <>
                          <Send size={18} />
                          Submit Ruling
                        </>
                      )}
                    </motion.button>
                  </>
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
                      {evaluationResult.normalized_call && 
                       evaluationResult.normalized_call.toLowerCase() !== userAnswer.trim().toLowerCase() && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                            Your Call (Normalized)
                          </p>
                          <p className="text-ink">{evaluationResult.normalized_call}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                          Explanation
                        </p>
                        <p className="text-ink">{evaluationResult.explanation}</p>
                      </div>
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
                        setUserAnswer("");
                        setTimeLeft(6);
                        setTimeTaken(null);
                        setEvaluationError(null);
                      }}
                      className="pill text-white w-full justify-center"
                    >
                      <RefreshCcw size={18} />
                      Try Again
                    </motion.button>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Leaderboard - 2 cols */}
            <motion.div
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              className="lg:col-span-2 card h-fit"
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
    </AuthGuard>
  );
}
