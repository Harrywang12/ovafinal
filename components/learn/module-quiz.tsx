"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { useSupabaseAuth } from "../../lib/useSupabaseAuth";
import {
  MODULE_PASS_CORRECT_REQUIREMENT,
  MODULE_PASS_PERCENT,
  MODULE_PASS_QUESTION_REQUIREMENT,
  questionLevelLabel,
  type ModuleProgressSummary,
  type QuestionLevel,
} from "../../lib/learning";

interface QuizData {
  id: string;
  module_id?: string;
  question_level?: QuestionLevel;
  question: string;
  options: string[];
  rule_reference?: string | null;
}

type QuizFeedback = {
  correct: boolean;
  answer: string;
  explanation: string;
  rule_reference?: string | null;
  source_excerpt?: string | null;
  source_title?: string | null;
};

interface ModuleQuizProps {
  module: Module;
  nextModule?: Module;
  progress?: ModuleProgressSummary | null;
}

export function ModuleQuiz({ module, nextModule, progress }: ModuleQuizProps) {
  const { session } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<QuizFeedback | null>(null);
  const [attemptResult, setAttemptResult] = useState<{
    latest_attempts_count: number;
    latest_correct_count: number;
    latest_score_percent: number;
    passed: boolean;
  } | null>(null);

  const loadQuiz = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/learn/module-question", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ module_id: module.id })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error || "Failed to load quiz");
      return data;
    },
    onSuccess: (data) => {
      setSelectedAnswer(null);
      setIsCorrect(null);
      setFeedback(null);
      setAttemptResult(null);
      setQuiz(data);
    }
  });

  const saveAttempt = useMutation({
    mutationFn: async (payload: { question_id: string; selected_option: string }) => {
      const res = await fetch("/api/learn/module-attempt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          module_id: module.id,
          question_id: payload.question_id,
          selected_option: payload.selected_option,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save module attempt");
      return data as {
        correct: boolean;
        answer: string;
        explanation: string;
        rule_reference?: string | null;
        source_excerpt?: string | null;
        source_title?: string | null;
        latest_attempts_count: number;
        latest_correct_count: number;
        latest_score_percent: number;
        passed: boolean;
      };
    },
    onSuccess: (data) => {
      setIsCorrect(data.correct);
      setFeedback(data);
      setAttemptResult(data);
      queryClient.invalidateQueries({ queryKey: ["learn-progress"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const checkAnswer = (answer: string) => {
    if (!quiz || isCorrect !== null || saveAttempt.isPending) return;
    setSelectedAnswer(answer);
    saveAttempt.mutate({ question_id: quiz.id, selected_option: answer });
  };

  const retryQuiz = () => {
    setQuiz(null);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setFeedback(null);
    loadQuiz.mutate();
  };

  const visibleProgress = attemptResult
    ? {
        latest_attempts_count: attemptResult.latest_attempts_count,
        latest_correct_count: attemptResult.latest_correct_count,
        latest_score_percent: attemptResult.latest_score_percent,
        passed: attemptResult.passed,
      }
    : progress
      ? {
          latest_attempts_count: progress.latest_attempts_count,
          latest_correct_count: progress.latest_correct_count,
          latest_score_percent: progress.latest_score_percent,
          passed: progress.passed,
        }
      : null;

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
              Tracked Knowledge Check
            </p>
            <h3 className="text-2xl font-display font-bold text-primary">
              Module Quiz
            </h3>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mb-8">
          <div className="rounded-xl border border-border bg-surface p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Requirement</p>
            <p className="text-sm font-bold text-primary">
              {MODULE_PASS_CORRECT_REQUIREMENT}/{MODULE_PASS_QUESTION_REQUIREMENT} correct
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Latest Score</p>
            <p className="text-sm font-bold text-primary">
              {visibleProgress
                ? `${visibleProgress.latest_correct_count}/${Math.max(visibleProgress.latest_attempts_count, MODULE_PASS_QUESTION_REQUIREMENT)} (${visibleProgress.latest_score_percent}%)`
                : `0/${MODULE_PASS_QUESTION_REQUIREMENT} (0%)`}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Status</p>
            <p className={`text-sm font-bold ${visibleProgress?.passed ? "text-green-700" : "text-primary"}`}>
              {visibleProgress?.passed ? "Passed" : `${MODULE_PASS_PERCENT}% to pass`}
            </p>
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
                Test your understanding of {module.title}. Your answers count toward module progress.
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
              {quiz.question_level && (
                <span className="inline-flex w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                  {questionLevelLabel(quiz.question_level)}
                </span>
              )}
              <p className="text-lg font-semibold text-primary leading-relaxed">
                {quiz.question}
              </p>

              {/* Options */}
              <div className="space-y-3">
                {quiz.options?.map((option, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  const isSelected = selectedAnswer === option;
                  const isThisCorrect = option === feedback?.answer;
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
                      disabled={isCorrect !== null || saveAttempt.isPending}
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
                        <p className="text-sm text-muted">{feedback?.explanation}</p>
                        {(feedback?.rule_reference || quiz.rule_reference) && (
                          <p className="mt-2 text-xs font-semibold text-primary">{feedback?.rule_reference || quiz.rule_reference}</p>
                        )}
                        {feedback?.source_excerpt && (
                          <p className="mt-2 text-xs leading-5 text-muted">{feedback.source_title ? `${feedback.source_title}: ` : ""}{feedback.source_excerpt}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {saveAttempt.isError && isCorrect === null && (
                <p className="text-sm font-semibold text-red-600">{(saveAttempt.error as Error).message}</p>
              )}

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
