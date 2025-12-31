"use client";

import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, CheckCircle2, XCircle, ArrowRight, Zap, BookOpen, Target } from "lucide-react";
import { AuthGuard } from "../../components/auth-guard";
import { fadeInUp, staggerContainer, staggerItem } from "../../lib/animations";

type Question = {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  rule_reference?: string;
};

const difficulties = ["easy", "medium", "hard"] as const;

const difficultyColors = {
  easy: "bg-green-500",
  medium: "bg-accent",
  hard: "bg-red-500",
};

export default function QuizPage() {
  const [difficulty, setDifficulty] = useState<(typeof difficulties)[number]>("medium");
  const [current, setCurrent] = useState<Question | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  // Store questions by difficulty to restore when switching back
  const [questionsByDifficulty, setQuestionsByDifficulty] = useState<Record<string, Question>>({});
  // Track which difficulty the current question belongs to
  const [currentQuestionDifficulty, setCurrentQuestionDifficulty] = useState<string | null>(null);

  const generateMutation = useMutation({
    mutationFn: async (diff: string) => {
      const res = await fetch("/api/generate-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty: diff })
      });
      if (!res.ok) throw new Error("Failed to generate question");
      return res.json();
    },
    onSuccess: (data, diff) => {
      setCurrent(data);
      setCurrentQuestionDifficulty(diff);
      // Store the question for this difficulty
      setQuestionsByDifficulty(prev => ({ ...prev, [diff]: data }));
      setSelected(null);
      setResult(null);
    }
  });

  // Handle difficulty change: restore question if exists, otherwise clear
  const handleDifficultyChange = (newDifficulty: (typeof difficulties)[number]) => {
    setDifficulty(newDifficulty);
    
    // If there's a question stored for this difficulty, restore it
    if (questionsByDifficulty[newDifficulty]) {
      setCurrent(questionsByDifficulty[newDifficulty]);
      setCurrentQuestionDifficulty(newDifficulty);
      // Reset answer state when restoring
      setSelected(null);
      setResult(null);
      setRecommendation(null);
    } else {
      // No question for this difficulty, clear the display
      setCurrent(null);
      setCurrentQuestionDifficulty(null);
      setSelected(null);
      setResult(null);
      setRecommendation(null);
    }
  };

  const saveAttempt = useMutation({
    mutationFn: async (payload: object) => {
      const res = await fetch("/api/quiz-attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to save attempt");
      return res.json();
    }
  });

  const checkAnswer = () => {
    if (!current || !selected) return;
    const correct = selected === current.answer;
    setResult(correct ? "correct" : "incorrect");
    setRecommendation(
      correct
        ? null
        : `You missed a ${difficulty} item. Review module: ${
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

          {/* Difficulty Selector & New Question */}
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
                onClick={() => handleDifficultyChange(d)}
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
              onClick={() => generateMutation.mutate(difficulty)}
              disabled={generateMutation.isPending}
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
                    <span className={`w-2 h-2 rounded-full ${difficultyColors[(currentQuestionDifficulty as typeof difficulties[number]) || difficulty]}`} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                      {(currentQuestionDifficulty || difficulty)} Question
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
                        onClick={() => generateMutation.mutate(difficulty)}
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
                  onClick={() => generateMutation.mutate(difficulty)}
                  disabled={generateMutation.isPending}
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
