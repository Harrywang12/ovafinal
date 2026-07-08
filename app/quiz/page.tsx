"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, CheckCircle2, XCircle, ArrowRight, Zap, BookOpen, Target } from "lucide-react";
import { AuthGuard } from "../../components/auth-guard";
import { fadeInUp, staggerContainer, staggerItem } from "../../lib/animations";
import { useSupabaseAuth } from "../../lib/useSupabaseAuth";

type Question = {
  adaptive_difficulty?: AdaptiveDifficulty;
  difficulty_label?: string;
  question_level?: "beginner" | "intermediate" | "hard";
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  rule_reference?: string;
};

type AdaptiveDifficulty = "easy" | "medium" | "hard";

type AdaptiveState = {
  referee_level: "level_1" | "level_2" | "level_3" | "level_4";
  initial_difficulty: AdaptiveDifficulty;
  current_difficulty: AdaptiveDifficulty;
  difficulty_label: string;
  question_level: "beginner" | "intermediate" | "hard";
  correct_streak: number;
  incorrect_streak: number;
  updated_at: string | null;
  quiz_assignment: QuizAssignmentProgress;
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

const difficultyColors: Record<AdaptiveDifficulty, string> = {
  easy: "bg-green-500",
  medium: "bg-accent",
  hard: "bg-red-500",
};

export default function QuizPage() {
  const { session } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const [current, setCurrent] = useState<Question | null>(null);
  const [askedQuestions, setAskedQuestions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null);
  const [recommendation, setRecommendation] = useState<string | null>(null);

  const adaptiveQuery = useQuery<AdaptiveState>({
    queryKey: ["quiz-adaptive-state"],
    enabled: !!session?.access_token,
    queryFn: async () => {
      const res = await fetch("/api/quiz-state", {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to load adaptive quiz state");
      return res.json();
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/generate-question", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ recent_questions: askedQuestions.slice(-15) })
      });
      if (!res.ok) throw new Error("Failed to generate question");
      return res.json();
    },
    onSuccess: (data) => {
      setCurrent(data);
      setSelected(null);
      setResult(null);
      setRecommendation(null);
      if (data?.question) {
        setAskedQuestions((prev) => [...prev, data.question].slice(-15));
      }
    }
  });

  const saveAttempt = useMutation({
    mutationFn: async (payload: object) => {
      const res = await fetch("/api/quiz-attempt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to save attempt");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.adaptive_state) {
        queryClient.setQueryData(["quiz-adaptive-state"], (prev: AdaptiveState | undefined) => ({
          referee_level: prev?.referee_level ?? "level_1",
          initial_difficulty: prev?.initial_difficulty ?? "easy",
          quiz_assignment: data.quiz_assignment ?? prev?.quiz_assignment,
          ...data.adaptive_state,
        }));
      }
    },
  });

  const checkAnswer = () => {
    if (!current || !selected) return;
    const correct = selected === current.answer;
    const currentDifficultyLabel =
      current.difficulty_label || adaptiveQuery.data?.difficulty_label || "Adaptive";
    setResult(correct ? "correct" : "incorrect");
    setRecommendation(
      correct
        ? null
        : `You missed a ${currentDifficultyLabel.toLowerCase()} item. Review module: ${
            current.rule_reference?.includes("rotation")
              ? "Rotations"
              : current.rule_reference?.includes("net")
                ? "Blocking"
                : "Faults"
          }.`
    );
    saveAttempt.mutate({
      question: current,
      selected_option: selected,
      correct
    });
  };

  const options = useMemo(() => current?.options || [], [current]);
  const visibleDifficulty = current?.adaptive_difficulty || adaptiveQuery.data?.current_difficulty || "medium";
  const visibleDifficultyLabel = current?.difficulty_label || adaptiveQuery.data?.difficulty_label || "Intermediate";
  const currentStreak = adaptiveQuery.data
    ? adaptiveQuery.data.correct_streak > 0
      ? `${adaptiveQuery.data.correct_streak} correct streak`
      : adaptiveQuery.data.incorrect_streak > 0
        ? `${adaptiveQuery.data.incorrect_streak} wrong streak`
        : "No active streak"
    : "Loading streak";
  const quizAssignment = adaptiveQuery.data?.quiz_assignment;

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
              <Sparkles size={32} />
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-primary mb-4">
              Adaptive Quiz
            </h1>
            <p className="text-muted text-lg max-w-xl mx-auto">
              AI-generated questions from the official rulebook. Every answer is grounded and cited.
            </p>
          </motion.div>

          {/* Adaptive status & New Question */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex flex-wrap items-center justify-center gap-3 mb-10"
          >
            <div className="inline-flex items-center gap-3 rounded-full bg-white border border-border px-5 py-2.5 shadow-sm">
              <span className={`w-2 h-2 rounded-full ${difficultyColors[visibleDifficulty]}`} />
              <span className="text-sm font-bold text-primary">
                {visibleDifficultyLabel}
              </span>
              <span className="text-xs text-muted">{currentStreak}</span>
            </div>
            <motion.button
              variants={staggerItem}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending || adaptiveQuery.isLoading}
              className="pill text-white"
            >
              {generateMutation.isPending ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Zap size={18} />
                  </motion.span>
                  Generating...
                </>
              ) : (
                <>
                  <Zap size={18} />
                  New Question
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
              { icon: Target, title: "Adaptive", desc: "Scales with you" },
              { icon: BookOpen, title: "Cited", desc: "Rulebook grounded" },
              { icon: Sparkles, title: "Tracked", desc: "Progress saved" },
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

          {quizAssignment?.assigned && (
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              className={`card mb-10 ${quizAssignment.passed ? "border-green-200 bg-green-50" : ""}`}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                    Assigned Quiz Quota
                  </p>
                  <h2 className="text-xl font-display font-bold text-primary">
                    {quizAssignment.attempted}/{quizAssignment.question_quota} problems completed
                  </h2>
                  <p className="text-sm text-muted mt-1">
                    {quizAssignment.correct} correct · {quizAssignment.score_percent}% score · required {quizAssignment.required_percent}%
                  </p>
                </div>
                <span className={`inline-flex w-fit px-3 py-1 rounded-full text-sm font-bold border ${
                  quizAssignment.passed
                    ? "bg-green-100 text-green-700 border-green-200"
                    : "bg-primary/10 text-primary border-primary/20"
                }`}>
                  {quizAssignment.passed ? "Quota Passed" : `${quizAssignment.remaining} remaining`}
                </span>
              </div>
              <div className="mt-4 h-2 rounded-full bg-white border border-border overflow-hidden">
                <div
                  className={quizAssignment.passed ? "h-full bg-green-500" : "h-full bg-primary"}
                  style={{ width: `${Math.min(100, Math.round((quizAssignment.attempted / quizAssignment.question_quota) * 100))}%` }}
                />
              </div>
            </motion.div>
          )}

          {/* Question Card */}
          <AnimatePresence mode="wait">
            {current ? (
              <motion.div
                key={current.question}
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: 20 }}
                className="card space-y-6"
              >
                {/* Question */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-2 h-2 rounded-full ${difficultyColors[visibleDifficulty]}`} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                      {visibleDifficultyLabel} Question
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-display font-bold text-primary">
                    {current.question}
                  </h2>
                </div>

                {/* Options */}
                <div className="grid md:grid-cols-2 gap-3 relative z-10">
                  {options.map((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    const isSelected = selected === opt;
                    const isCorrect = result && opt === current.answer;
                    const isWrong = result === "incorrect" && isSelected;
                    
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => !result && setSelected(opt)}
                        disabled={!!result}
                        className={`p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${
                          isCorrect
                            ? "border-green-500 bg-green-50"
                            : isWrong
                              ? "border-red-500 bg-red-50"
                              : isSelected
                                ? "border-accent bg-accent/5"
                                : "border-border hover:border-accent/40 bg-white"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                            isCorrect
                              ? "bg-green-500 text-white"
                              : isWrong
                                ? "bg-red-500 text-white"
                                : isSelected
                                  ? "bg-accent text-white"
                                  : "bg-surface text-primary"
                          }`}>
                            {isCorrect ? (
                              <CheckCircle2 size={18} />
                            ) : isWrong ? (
                              <XCircle size={18} />
                            ) : (
                              letter
                            )}
                          </span>
                          <span className={`text-sm md:text-base ${
                            isCorrect || isWrong ? "font-medium" : ""
                          } ${isCorrect ? "text-green-700" : isWrong ? "text-red-700" : "text-ink"}`}>
                            {opt}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Submit Button */}
                {!result && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={checkAnswer}
                    disabled={!selected}
                    className="pill text-white w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit Answer
                    <ArrowRight size={18} />
                  </motion.button>
                )}

                {/* Result & Explanation */}
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
                            {result === "correct" ? "Correct!" : "Incorrect"}
                          </span>
                        </div>
                      </div>

                      {/* Explanation */}
                      <div className="p-4 rounded-xl bg-surface border border-border">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                          Explanation
                        </p>
                        <p className="text-ink">{current.explanation}</p>
                        {current.rule_reference && (
                          <p className="text-sm text-accent mt-3 font-medium">
                            📖 Rule: {current.rule_reference}
                          </p>
                        )}
                      </div>

                      {/* Recommendation */}
                      {recommendation && (
                        <div className="p-4 rounded-xl bg-accent/10 border border-accent/20">
                          <p className="text-sm font-semibold text-accent">
                            💡 {recommendation}
                          </p>
                        </div>
                      )}

                      {/* Next Question Button */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => generateMutation.mutate()}
                        disabled={generateMutation.isPending}
                        className="pill text-white w-full justify-center disabled:opacity-80"
                      >
                        {generateMutation.isPending ? (
                          <>
                            <motion.span
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            >
                              <Zap size={18} />
                            </motion.span>
                            Generating Question...
                          </>
                        ) : (
                          <>
                            Next Question
                            <ArrowRight size={18} />
                          </>
                        )}
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
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-accent/10 text-accent mb-6"
                >
                  <Zap size={40} />
                </motion.div>
                <h3 className="text-xl font-display font-bold text-primary mb-2">
                  Ready to Test Your Knowledge?
                </h3>
                <p className="text-muted mb-6">
                  Click &quot;New Question&quot; to generate an AI-powered quiz question.
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending || adaptiveQuery.isLoading}
                  className="pill text-white disabled:opacity-80"
                >
                  {generateMutation.isPending ? (
                    <>
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Zap size={18} />
                      </motion.span>
                      Generating Question...
                    </>
                  ) : (
                    <>
                      <Zap size={18} />
                      Generate Question
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
