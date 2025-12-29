"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, RefreshCcw, Medal, Crown, Send, Loader2, Video } from "lucide-react";
import { AuthGuard } from "../../components/auth-guard";
import { fadeInUp, staggerContainer, staggerItem, scaleIn } from "../../lib/animations";

const rankColors = [
  "from-yellow-400 to-amber-500", // Gold
  "from-gray-300 to-gray-400",     // Silver
  "from-amber-600 to-amber-700",   // Bronze
];

const rankIcons = [Crown, Medal, Medal];

export default function ChallengePage() {
  const [score, setScore] = useState(0);
  const [userId, setUserId] = useState("");

  const challengeQuery = useQuery({
    queryKey: ["challenge"],
    queryFn: async () => {
      const res = await fetch("/api/challenge");
      if (!res.ok) throw new Error("Failed to load challenge");
      return res.json();
    }
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId || undefined,
          video_id: challengeQuery.data?.video?.id,
          score
        })
      });
      if (!res.ok) throw new Error("Failed to submit");
      return res.json();
    },
    onSuccess: () => challengeQuery.refetch()
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
                    {video.rule_reference && (
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
                      Submit Score
                    </h3>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
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
                      Score
                    </label>
                    <input
                      type="number"
                      value={score}
                      onChange={(e) => setScore(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                  </div>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending || !video}
                  className="pill text-white w-full justify-center mt-4 disabled:opacity-50"
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Submit Score
                    </>
                  )}
                </motion.button>
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
