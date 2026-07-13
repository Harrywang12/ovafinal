import { z } from "zod";
import { quizDifficultySchema, quizDisciplineSchema, refereeLevelSchema } from "./quiz-programs";
import { containsRallyballContent, type RuleSet } from "./rule-source-classification";

export const refereeRoleSchema = z.enum([
  "first_referee",
  "second_referee",
  "scorer",
  "line_judge",
  "joint_crew",
  "not_applicable",
]);

export const questionStyleSchema = z.enum([
  "referee_ruling",
  "next_procedure",
  "fault_or_legal_action",
  "correction_procedure",
  "official_responsibility",
  "sequence_order",
  "rule_exception",
  "sanction_consequence",
  "position_rotation_analysis",
  "statement_accuracy",
]);

export type QuestionStyle = z.infer<typeof questionStyleSchema>;

const nonEmpty = z.string().trim().min(1);
const conceptLabel = z.string().trim().regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, "Must be a specific snake_case label");
const GENERIC_CONCEPT_LABELS = new Set(["scenario", "game_scenario", "rule_application", "decision", "procedure", "question"]);

export const generatedQuizQuestionSchema = z.object({
  question: nonEmpty,
  options: z.tuple([nonEmpty, nonEmpty, nonEmpty, nonEmpty]),
  answer: nonEmpty,
  explanation: nonEmpty,
  ruleReference: nonEmpty,
  discipline: quizDisciplineSchema,
  refereeLevel: refereeLevelSchema,
  difficulty: quizDifficultySchema,
  topic: nonEmpty,
  subtopic: conceptLabel,
  ruleId: nonEmpty,
  scenarioType: conceptLabel,
  refereeRole: refereeRoleSchema,
  decisionType: conceptLabel,
  questionStyle: questionStyleSchema.default("referee_ruling"),
  sourceDocumentId: z.string().uuid(),
  sourceChunkIds: z.array(z.string().uuid()).min(1),
  sourceExcerpt: z.string().trim().min(20),
}).superRefine((value, ctx) => {
  const normalized = value.options.map((option) => option.trim().toLowerCase());
  if (new Set(normalized).size !== 4) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["options"], message: "Options must be unique" });
  }
  if (!value.options.includes(value.answer)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["answer"], message: "Answer must exactly match an option" });
  }
  for (const key of ["subtopic", "scenarioType", "decisionType"] as const) {
    if (GENERIC_CONCEPT_LABELS.has(value[key])) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${key} must describe the specific tested concept` });
    }
  }
});

export type GeneratedQuizQuestion = z.infer<typeof generatedQuizQuestionSchema>;

export function parseGeneratedQuestionJson(content: string): unknown {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(trimmed);
}

function normalizeEvidenceText(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function sourceRuleNumbers(chunk: { rule_number?: string | null; chunk_text: string }) {
  const values = new Set<string>();
  if (chunk.rule_number) values.add(chunk.rule_number);
  for (const match of chunk.chunk_text.matchAll(/\b(\d{1,2}(?:\.\d+){1,4})\s+(?=[A-Z])/g)) values.add(match[1]);
  return values;
}

export function validateGeneratedQuestion(
  input: unknown,
  expected: { discipline: "indoor" | "beach"; refereeLevel: "level_1" | "level_2" | "level_3" | "level_4"; difficulty: "basic" | "applied" | "advanced"; topic?: string; questionStyle?: QuestionStyle; requireSourceTopic?: boolean },
  validChunks: Array<{ id: string; document_id: string; chunk_text: string; ruleset: RuleSet; rule_number?: string | null; topic?: string | null; topic_tags?: string[] }>
): GeneratedQuizQuestion {
  const question = generatedQuizQuestionSchema.parse(input);
  if (question.discipline !== expected.discipline) throw new Error("Generated discipline does not match the request");
  if (question.refereeLevel !== expected.refereeLevel) throw new Error("Generated referee level does not match the request");
  if (question.difficulty !== expected.difficulty) throw new Error("Generated difficulty does not match the request");
  if (expected.topic && question.topic !== expected.topic) throw new Error("Generated topic does not match the request");
  if (expected.questionStyle && question.questionStyle !== expected.questionStyle) throw new Error("Generated question style does not match the assigned blueprint");
  const requiredRuleset = expected.discipline === "indoor" ? "standard_indoor" : "beach";
  if (validChunks.some((chunk) => chunk.ruleset !== requiredRuleset)) {
    throw new Error(`Retrieved source ruleset does not match ${expected.discipline} generation`);
  }
  if (expected.discipline === "indoor") {
    const generatedText = [question.question, ...question.options, question.explanation, question.sourceExcerpt].join(" ");
    if (containsRallyballContent(generatedText)) {
      throw new Error("Generated Indoor question contains Rallyball or Tripleball content");
    }
  }

  const validIds = new Set(validChunks.map((chunk) => chunk.id));
  if (question.sourceChunkIds.some((id) => !validIds.has(id))) throw new Error("Generated question cited an unretrieved source chunk");
  const citedChunks = validChunks.filter((chunk) => question.sourceChunkIds.includes(chunk.id));
  if (!citedChunks.length || citedChunks.some((chunk) => chunk.document_id !== question.sourceDocumentId)) {
    throw new Error("Source document does not match the cited chunks");
  }
  const expectedTopic = expected.topic;
  if (expectedTopic && expected.requireSourceTopic !== false && citedChunks.some((chunk) => chunk.topic !== expectedTopic && !chunk.topic_tags?.includes(expectedTopic))) {
    throw new Error("Cited source does not match the requested topic");
  }
  const normalizedExcerpt = normalizeEvidenceText(question.sourceExcerpt);
  const contextSupportsExcerpt = citedChunks.some((chunk) => normalizeEvidenceText(chunk.chunk_text).includes(normalizedExcerpt));
  if (!contextSupportsExcerpt) {
    throw new Error("Source excerpt is not a contiguous passage in the cited context");
  }
  const citedRuleNumbers = new Set(citedChunks.flatMap((chunk) => Array.from(sourceRuleNumbers(chunk))));
  if (citedRuleNumbers.size > 0 && !citedRuleNumbers.has(question.ruleId)) throw new Error("Rule ID does not match the cited source section");
  const excerptRule = question.sourceExcerpt.match(/\bRule\s+(\d+(?:\.\d+){0,4})\b/i)?.[1];
  if (excerptRule && !question.ruleId.includes(excerptRule) && !excerptRule.includes(question.ruleId)) {
    throw new Error("Rule ID does not match the explicit rule in the source excerpt");
  }
  return question;
}

export function shuffleQuestionOptions(question: GeneratedQuizQuestion, random = Math.random): GeneratedQuizQuestion {
  const options = [...question.options];
  for (let index = options.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [options[index], options[swapIndex]] = [options[swapIndex], options[index]];
  }
  return { ...question, options: options as [string, string, string, string] };
}
