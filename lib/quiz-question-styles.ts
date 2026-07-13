import { questionStyleSchema, type QuestionStyle } from "./generated-quiz-question";
import type { QuizDifficulty } from "./quiz-programs";
import type { StructuredQuizHistory } from "./quiz-question-history";

export const QUESTION_STYLES = questionStyleSchema.options;

const STYLE_INSTRUCTIONS: Record<QuestionStyle, string> = {
  referee_ruling: "Present an observable match event and ask for the referee's correct ruling.",
  next_procedure: "Ask what the appropriate official or team must do next in the procedure.",
  fault_or_legal_action: "Ask the learner to distinguish a fault from a legal action using the source rule.",
  correction_procedure: "Present an identified error or improper situation and ask how it must be corrected.",
  official_responsibility: "Ask which official is responsible or what that official must verify, signal, or record.",
  sequence_order: "Ask about the correct order of rule-governed actions or signals.",
  rule_exception: "Test an explicit exception, restriction, or condition stated in the source.",
  sanction_consequence: "Ask for the correct warning, sanction, consequence, or recording procedure.",
  position_rotation_analysis: "Describe positions, service order, or rotation and ask for the correct diagnosis or action.",
  statement_accuracy: "Ask which of four concrete statements is supported by the cited rule text.",
};

function compatibleStyles(topic: string, difficulty: QuizDifficulty) {
  const styles = new Set<QuestionStyle>([
    "referee_ruling",
    "next_procedure",
    "fault_or_legal_action",
    "correction_procedure",
    "sequence_order",
    "statement_accuracy",
  ]);
  if (/misconduct|conduct|sanction/i.test(topic)) styles.add("sanction_consequence");
  if (/rotation|position|service/i.test(topic)) styles.add("position_rotation_analysis");
  if (/referee|signal|crew|cooperation|management|procedure/i.test(topic)) styles.add("official_responsibility");
  if (difficulty !== "basic") styles.add("rule_exception");
  return Array.from(styles);
}

export function styleInstruction(style: QuestionStyle) {
  return STYLE_INSTRUCTIONS[style];
}

export function selectQuestionStyles(
  topic: string,
  difficulty: QuizDifficulty,
  count: number,
  history: StructuredQuizHistory[],
  offset = 0,
  random = Math.random
) {
  const recent = history.slice(0, 12).map((item) => item.questionStyle).filter(Boolean);
  const styles = compatibleStyles(topic, difficulty)
    .map((style) => ({
      style,
      recentIndex: recent.indexOf(style),
      random: random(),
    }))
    .sort((a, b) => {
      const aPenalty = a.recentIndex < 0 ? -1 : 12 - a.recentIndex;
      const bPenalty = b.recentIndex < 0 ? -1 : 12 - b.recentIndex;
      return aPenalty - bPenalty || a.random - b.random;
    })
    .map((item) => item.style);
  return Array.from({ length: count }, (_, index) => styles[(index + offset) % styles.length]);
}
