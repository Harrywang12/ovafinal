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

const nonEmpty = z.string().trim().min(1);

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
  subtopic: nonEmpty,
  ruleId: nonEmpty,
  scenarioType: nonEmpty,
  refereeRole: refereeRoleSchema,
  decisionType: nonEmpty,
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
});

export type GeneratedQuizQuestion = z.infer<typeof generatedQuizQuestionSchema>;

export function parseGeneratedQuestionJson(content: string): unknown {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(trimmed);
}

export function validateGeneratedQuestion(
  input: unknown,
  expected: { discipline: "indoor" | "beach"; refereeLevel: "level_1" | "level_2" | "level_3" | "level_4"; difficulty: "basic" | "applied" | "advanced" },
  validChunks: Array<{ id: string; document_id: string; chunk_text: string; ruleset: RuleSet; rule_number?: string | null }>
): GeneratedQuizQuestion {
  const question = generatedQuizQuestionSchema.parse(input);
  if (question.discipline !== expected.discipline) throw new Error("Generated discipline does not match the request");
  if (question.refereeLevel !== expected.refereeLevel) throw new Error("Generated referee level does not match the request");
  if (question.difficulty !== expected.difficulty) throw new Error("Generated difficulty does not match the request");
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
  if (!citedChunks.some((chunk) => chunk.document_id === question.sourceDocumentId)) {
    throw new Error("Source document does not match the cited chunks");
  }
  const normalizedExcerpt = question.sourceExcerpt.toLowerCase().replace(/\s+/g, " ").trim();
  const contextSupportsExcerpt = citedChunks.some((chunk) =>
    chunk.chunk_text.toLowerCase().replace(/\s+/g, " ").includes(normalizedExcerpt)
  );
  if (!contextSupportsExcerpt) throw new Error("Source excerpt is not present in cited context");
  const taggedRules = citedChunks
    .map((chunk) => chunk.rule_number)
    .filter((value): value is string => !!value);
  if (taggedRules.length && !taggedRules.some((rule) => question.ruleId.includes(rule) || rule.includes(question.ruleId))) {
    throw new Error("Rule ID does not match the cited source metadata");
  }
  const evidenceTokens = new Set(normalizedExcerpt.split(/[^a-z0-9]+/).filter((token) => token.length >= 4));
  for (const [field, text] of [["answer", question.answer], ["explanation", question.explanation]] as const) {
    const supported = text.toLowerCase().split(/[^a-z0-9]+/).some((token) => evidenceTokens.has(token));
    if (!supported) throw new Error(`Generated ${field} is not supported by the cited excerpt`);
  }
  return question;
}
