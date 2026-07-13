import { z } from "zod";

export const quizDisciplineSchema = z.enum(["indoor", "beach"]);
export const refereeLevelSchema = z.enum(["level_1", "level_2", "level_3", "level_4"]);
export const quizDifficultySchema = z.enum(["basic", "applied", "advanced"]);

export type QuizDiscipline = z.infer<typeof quizDisciplineSchema>;
export type QuizDifficulty = z.infer<typeof quizDifficultySchema>;
export type RefereeLevel = z.infer<typeof refereeLevelSchema>;

export const topicBlueprintItemSchema = z.object({
  topic: z.string().trim().min(1),
  count: z.number().int().positive(),
});

export type TopicBlueprintItem = z.infer<typeof topicBlueprintItemSchema>;

export const difficultyMixSchema = z.object({
  basic: z.number().min(0).max(1),
  applied: z.number().min(0).max(1),
  advanced: z.number().min(0).max(1),
}).refine((value) => Math.abs(value.basic + value.applied + value.advanced - 1) < 0.001, {
  message: "Difficulty weights must total 1",
});

export const difficultyProgressionSchema = z.array(z.object({
  throughQuiz: z.number().int().positive().nullable(),
  mix: difficultyMixSchema,
})).min(1);

export const quizProgramInputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  discipline: quizDisciplineSchema,
  refereeLevel: refereeLevelSchema,
  requiredQuizCount: z.number().int().positive().max(100),
  questionsPerQuiz: z.number().int().positive().max(30),
  minimumScorePercent: z.number().int().min(0).max(100),
  startAt: z.string().datetime().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  topicBlueprint: z.array(topicBlueprintItemSchema).min(1),
  difficultyProgression: difficultyProgressionSchema,
}).superRefine((value, ctx) => {
  const total = value.topicBlueprint.reduce((sum, item) => sum + item.count, 0);
  if (total !== value.questionsPerQuiz) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["topicBlueprint"],
      message: `Topic blueprint contains ${total} questions; expected ${value.questionsPerQuiz}`,
    });
  }
  if (value.startAt && value.dueAt && Date.parse(value.dueAt) <= Date.parse(value.startAt)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dueAt"],
      message: "Due date must be after the start date",
    });
  }
  if (value.refereeLevel === "level_1") {
    const levelTwoTopics = /authority|positioning|cooperation|match_management|second_referee/i;
    if (value.topicBlueprint.some((item) => levelTwoTopics.test(item.topic))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["topicBlueprint"],
        message: "Level 1 blueprints cannot include Level 2-only competencies",
      });
    }
  }
});

const sharedLevelOne: TopicBlueprintItem[] = [
  { topic: "playing_area_and_equipment", count: 1 },
  { topic: "team_composition", count: 1 },
  { topic: "service_and_service_order", count: 2 },
  { topic: "playing_actions", count: 2 },
  { topic: "interruptions", count: 1 },
  { topic: "misconduct", count: 1 },
  { topic: "signals_and_procedures", count: 1 },
  { topic: "basic_case_scenario", count: 1 },
];

export const DEFAULT_TOPIC_BLUEPRINTS: Record<QuizDiscipline, Record<"level_1" | "level_2", TopicBlueprintItem[]>> = {
  beach: {
    level_1: sharedLevelOne,
    level_2: [
      { topic: "first_referee_authority", count: 2 },
      { topic: "second_referee_responsibilities", count: 2 },
      { topic: "positioning_and_cooperation", count: 2 },
      { topic: "communication_and_signals", count: 1 },
      { topic: "match_management", count: 2 },
      { topic: "applied_case_scenario", count: 1 },
    ],
  },
  indoor: {
    level_1: sharedLevelOne,
    level_2: [
      { topic: "first_referee_authority", count: 2 },
      { topic: "second_referee_responsibilities", count: 2 },
      { topic: "rotations_and_positioning", count: 2 },
      { topic: "crew_cooperation", count: 1 },
      { topic: "match_management", count: 2 },
      { topic: "applied_case_scenario", count: 1 },
    ],
  },
};

export const DEFAULT_DIFFICULTY_PROGRESSION = [
  { throughQuiz: 5, mix: { basic: 0.8, applied: 0.2, advanced: 0 } },
  { throughQuiz: 10, mix: { basic: 0.5, applied: 0.5, advanced: 0 } },
  { throughQuiz: null, mix: { basic: 0.3, applied: 0.6, advanced: 0.1 } },
];

export function getDifficultyMix(
  quizNumber: number,
  progression: z.infer<typeof difficultyProgressionSchema> = DEFAULT_DIFFICULTY_PROGRESSION
) {
  return progression.find((step) => step.throughQuiz === null || quizNumber <= step.throughQuiz)?.mix
    ?? DEFAULT_DIFFICULTY_PROGRESSION[DEFAULT_DIFFICULTY_PROGRESSION.length - 1].mix;
}

export function expandTopicBlueprint(blueprint: TopicBlueprintItem[]): string[] {
  return blueprint.flatMap((item) => Array.from({ length: item.count }, () => item.topic));
}

export function allocateDifficulties(count: number, mix: z.infer<typeof difficultyMixSchema>): QuizDifficulty[] {
  const weighted: Array<[QuizDifficulty, number]> = [
    ["basic", mix.basic],
    ["applied", mix.applied],
    ["advanced", mix.advanced],
  ];
  const raw = weighted.map(([difficulty, weight]) => ({ difficulty, raw: weight * count }));
  const allocated = raw.map((item) => ({ ...item, count: Math.floor(item.raw) }));
  let remaining = count - allocated.reduce((sum, item) => sum + item.count, 0);
  allocated.sort((a, b) => (b.raw - b.count) - (a.raw - a.count));
  for (let index = 0; index < remaining; index += 1) allocated[index % allocated.length].count += 1;
  return allocated.flatMap((item) => Array.from({ length: item.count }, () => item.difficulty));
}

export type QuizProgramStatus = "not_started" | "in_progress" | "completed" | "overdue";

export function calculateQuizProgramStatus(input: {
  completedQuizzes: number;
  requiredQuizzes: number;
  dueAt?: string | null;
  now?: Date;
}): QuizProgramStatus {
  if (input.completedQuizzes >= input.requiredQuizzes) return "completed";
  if (input.dueAt && Date.parse(input.dueAt) < (input.now ?? new Date()).getTime()) return "overdue";
  return input.completedQuizzes > 0 ? "in_progress" : "not_started";
}
