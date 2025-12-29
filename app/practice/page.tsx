"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, Trophy, Play, CheckCircle2, XCircle, ArrowRight, Video, Zap } from "lucide-react";
import { AuthGuard } from "../../components/auth-guard";
import { fadeInUp, staggerContainer, staggerItem, scaleIn } from "../../lib/animations";

type PracticeVideo = {
  video_id: string;
  video_url: string;
  correct_call: string;
  explanation: string;
  rule_reference?: string;
  duration_seconds: number;
};

const difficulties = ["easy", "medium", "hard"] as const;

const difficultyColors = {
  easy: "bg-green-500",
  medium: "bg-accent",
  hard: "bg-red-500",
};

export default function PracticePage() {
  const [difficulty, setDifficulty] = useState<(typeof difficulties)[number]>("medium");
  const [clip, setClip] = useState<PracticeVideo | null>(null);
  const [call, setCall] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const clipQuery = useQuery({
    queryKey: ["practice", difficulty],
    queryFn: async () => {
      const res = await fetch(`/api/practice?difficulty=${difficulty}`);
      if (!res.ok) throw new Error("Failed to load practice clip");
      return res.json();
    },
  });

  useEffect(() => {
    if (clipQuery.data) {
      setClip(clipQuery.data);
      setResult(null);
      setCall("");
      setTimeLeft(clipQuery.data.duration_seconds);
    }
  }, [clipQuery.data]);

  useEffect(() => {
    clipQuery.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || result) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft, result]);

  const attemptMutation = useMutation({
    mutationFn: async (payload: object) => {
      const res = await fetch("/api/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to save attempt");
      return res.json();
    }
  });

  const checkCall = () => {
    if (!clip) return;
    const correct = call.trim().toLowerCase() === clip.correct_call.trim().toLowerCase();
    setResult(correct ? "correct" : "incorrect");
    attemptMutation.mutate({
      video_id: clip.video_id,
      correct,
      time_taken: clip.duration_seconds - (timeLeft || 0)
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
            <p className="text-muted text-lg max-w-xl mx-auto">
              Real game footage with timed decisions. Train your instincts at match speed.
            </p>
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
                key={clip.video_id}
                variants={scaleIn}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, scale: 0.95 }}
                className="card space-y-6"
              >
                {/* Timer */}
                {timeLeft !== null && !result && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                      Time to decide
                    </span>
                    <motion.div
                      animate={timeLeft <= 5 ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 0.5, repeat: timeLeft <= 5 ? Infinity : 0 }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold ${
                        timeLeft <= 5
                          ? "bg-red-100 text-red-600"
                          : "bg-surface text-primary"
                      }`}
                    >
                      <Timer size={18} />
                      {timeLeft}s
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
                  />
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${difficultyColors[difficulty]}`}>
                      {difficulty}
                    </span>
                  </div>
                </div>

                {/* Input & Submit */}
                {!result && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-primary mb-2">
                        Your Call
                      </label>
                      <input
                        value={call}
                        onChange={(e) => setCall(e.target.value)}
                        placeholder="e.g., Fault: Net touch on blocker"
                        className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                      />
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={checkCall}
                      disabled={!call.trim()}
                      className="pill text-white w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Submit Call
                      <ArrowRight size={18} />
                    </motion.button>
                  </div>
                )}

                {/* Result */}
                <AnimatePresence>
                  {result && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      {/* Result Banner */}
                      <div className={`p-4 rounded-xl ${
                        result === "correct"
                          ? "bg-green-100 border border-green-200"
                          : "bg-red-100 border border-red-200"
                      }`}>
                        <div className="flex items-center gap-3">
                          {result === "correct" ? (
                            <CheckCircle2 className="text-green-600" size={24} />
                          ) : (
                            <XCircle className="text-red-600" size={24} />
                          )}
                          <span className={`font-bold text-lg ${
                            result === "correct" ? "text-green-700" : "text-red-700"
                          }`}>
                            {result === "correct" ? "Correct Decision!" : "Incorrect Decision"}
                          </span>
                        </div>
                      </div>

                      {/* Correct Call & Explanation */}
                      <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                            Correct Call
                          </p>
                          <p className="text-ink font-semibold">{clip.correct_call}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                            Explanation
                          </p>
                          <p className="text-ink">{clip.explanation}</p>
                        </div>
                        {clip.rule_reference && (
                          <p className="text-sm text-accent font-medium">
                            📖 Rule: {clip.rule_reference}
                          </p>
                        )}
                      </div>

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
                  )}
                </AnimatePresence>
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
                  className="pill text-white"
                >
                  <Play size={18} />
                  Load Clip
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AuthGuard>
  );
}
