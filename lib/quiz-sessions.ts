import { generatedQuizQuestionSchema, type GeneratedQuizQuestion } from "./generated-quiz-question";

export type StoredSessionQuestion = {
  id: string;
  sequence_number: number;
  question_data: unknown;
};

export function publicQuizQuestion(row: StoredSessionQuestion) {
  const question = generatedQuizQuestionSchema.parse(row.question_data);
  const { answer: _answer, explanation: _explanation, sourceExcerpt: _sourceExcerpt, ...visible } = question;
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

export function toStructuredHistory(question: GeneratedQuizQuestion) {
  return { ...question, questionText: question.question };
}
