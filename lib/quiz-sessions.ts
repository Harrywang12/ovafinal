import { generatedQuizQuestionSchema } from "./generated-quiz-question";

// "submitting" is deliberately excluded: a submit that dies mid-flight must
// not block the learner from starting the next quiz.
export const ACTIVE_SESSION_STATUSES = ["generating", "ready", "in_progress"] as const;

// Generation runs inside one function invocation (maxDuration 300s). A
// session still "generating" after this long was killed mid-flight and will
// never finish, so it must not block the learner from starting again.
export const STALE_GENERATION_MS = 6 * 60 * 1000;

export function isStaleGeneratingSession(session: { status: string; created_at: string }, now = Date.now()) {
  return session.status === "generating" && now - Date.parse(session.created_at) > STALE_GENERATION_MS;
}

export type StoredSessionQuestion = {
  id: string;
  sequence_number: number;
  question_data: unknown;
};

export function publicQuizQuestion(row: StoredSessionQuestion) {
  const question = generatedQuizQuestionSchema.parse(row.question_data);
  const {
    answer: _answer,
    explanation: _explanation,
    sourceExcerpt: _sourceExcerpt,
    sourceDocumentId: _sourceDocumentId,
    sourceChunkIds: _sourceChunkIds,
    blueprintFingerprint: _blueprintFingerprint,
    ...visible
  } = question;
  return { id: row.id, sequenceNumber: row.sequence_number, ...visible };
}

export function gradeStoredAnswers(
  questions: StoredSessionQuestion[],
  answers: Array<{ questionId: string; selectedAnswer: string }>
) {
  const byId = new Map(answers.map((answer) => [answer.questionId, answer.selectedAnswer]));
  if (byId.size !== questions.length) throw new Error("Every session question must be answered exactly once");
  const graded = questions.map((row) => {
    const question = generatedQuizQuestionSchema.parse(row.question_data);
    const selectedAnswer = byId.get(row.id);
    if (!selectedAnswer || !question.options.includes(selectedAnswer)) throw new Error("A selected answer is invalid");
    return {
      questionId: row.id,
      selectedAnswer,
      correct: selectedAnswer === question.answer,
      question,
    };
  });
  const correctCount = graded.filter((item) => item.correct).length;
  return { graded, correctCount, scorePercent: Math.round((correctCount / questions.length) * 100) };
}
