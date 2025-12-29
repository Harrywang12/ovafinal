"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { 
  Lightbulb, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Trophy,
  ArrowRight,
  RefreshCw
} from "lucide-react";
import Link from "next/link";
import type { Module } from "../../lib/module-content";

interface QuizData {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

interface ModuleQuizProps {
  module: Module;
  nextModule?: Module;
}

export function ModuleQuiz({ module, nextModule }: ModuleQuizProps) {
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const loadQuiz = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module: module.id })
      });
      if (!res.ok) throw new Error("Failed to load quiz");
      return res.json();
    },
    onSuccess: (data) => {
      setSelectedAnswer(null);
      setIsCorrect(null);
      try {
        const parsed = JSON.parse(data.quiz);
        setQuiz(parsed);
      } catch {
        setQuiz(null);
      }
    }
  });

  const checkAnswer = (answer: string) => {
    if (!quiz || isCorrect !== null) return;
    setSelectedAnswer(answer);
    setIsCorrect(answer === quiz.answer);
  };

  const retryQuiz = () => {
    setQuiz(null);
    setSelectedAnswer(null);
    setIsCorrect(null);
    loadQuiz.mutate();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      {/* Decorative background */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/5 via-accent/5 to-transparent -z-10" />
      
      <div className="card p-8 border-2 border-primary/10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: `${module.color}15` }}
          >
            <Lightbulb size={28} style={{ color: module.color }} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Knowledge Check
            </p>
            <h3 className="text-2xl font-display font-bold text-primary">
              Module Quiz
            </h3>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!quiz && !loadQuiz.isPending && (
            <motion.div
              key="start"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8"
            >
              <p className="text-muted mb-6">
                Test your understanding of {module.title} with an AI-generated quiz question.
              </p>
              <motion.button
                onClick={() => loadQuiz.mutate()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="pill text-white"
              >
                <Lightbulb size={18} />
                Start Quiz
              </motion.button>
            </motion.div>
          )}

          {loadQuiz.isPending && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <Loader2 size={32} className="animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted">Generating your quiz question...</p>
            </motion.div>
          )}

          {quiz && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Question */}
              <p className="text-lg font-semibold text-primary leading-relaxed">
                {quiz.question}
              </p>

              {/* Options */}
              <div className="space-y-3">
                {quiz.options?.map((option, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  const isSelected = selectedAnswer === option;
                  const isThisCorrect = option === quiz.answer;
                  const showResult = isCorrect !== null;
                  
                  let bgClass = "bg-white border-border hover:border-primary/30";
                  let iconBg = "bg-gray-100";
                  
                  if (showResult) {
                    if (isThisCorrect) {
                      bgClass = "bg-green-50 border-green-500";
                      iconBg = "bg-green-500 text-white";
                    } else if (isSelected && !isThisCorrect) {
                      bgClass = "bg-red-50 border-red-500";
                      iconBg = "bg-red-500 text-white";
                    }
                  } else if (isSelected) {
                    bgClass = "bg-primary/5 border-primary";
                    iconBg = "bg-primary text-white";
                  }

                  return (
                    <motion.button
                      key={idx}
                      onClick={() => checkAnswer(option)}
                      disabled={isCorrect !== null}
                      whileHover={isCorrect === null ? { scale: 1.01, x: 4 } : {}}
                      whileTap={isCorrect === null ? { scale: 0.99 } : {}}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${bgClass}`}
                    >
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors ${iconBg}`}>
                        {showResult && isThisCorrect ? (
                          <CheckCircle2 size={16} />
                        ) : showResult && isSelected ? (
                          <XCircle size={16} />
                        ) : (
                          letter
                        )}
                      </span>
                      <span className="flex-1 text-ink">{option}</span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Result feedback */}
              <AnimatePresence>
                {isCorrect !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    className={`p-5 rounded-xl ${
                      isCorrect 
                        ? "bg-green-50 border border-green-200" 
                        : "bg-red-50 border border-red-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {isCorrect ? (
                        <Trophy className="text-green-600 flex-shrink-0" size={24} />
                      ) : (
                        <XCircle className="text-red-600 flex-shrink-0" size={24} />
                      )}
                      <div>
                        <p className={`font-semibold mb-2 ${
                          isCorrect ? "text-green-700" : "text-red-700"
                        }`}>
                          {isCorrect ? "Correct! Well done!" : "Not quite right"}
                        </p>
                        <p className="text-sm text-muted">{quiz.explanation}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              {isCorrect !== null && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-wrap gap-4 pt-4"
                >
                  <motion.button
                    onClick={retryQuiz}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn-secondary"
                  >
                    <RefreshCw size={16} />
                    Try Another Question
                  </motion.button>
                  
                  {nextModule && (
                    <Link href={`/learn/${nextModule.id}`}>
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="pill text-white"
                      >
                        Next: {nextModule.title}
                        <ArrowRight size={16} />
                      </motion.div>
                    </Link>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

