import { createClient } from "@supabase/supabase-js";
import { generateGroundedQuizQuestion } from "../lib/quiz-generation";
import { toStructuredHistory } from "../lib/quiz-sessions";

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey || !process.env.OPENAI_API_KEY) throw new Error("Quiz smoke-test environment is incomplete");
  const count = Number(process.argv.find((value) => value.startsWith("--count="))?.split("=")[1] || 1);
  if (!Number.isInteger(count) || count < 1 || count > 25) throw new Error("--count must be between 1 and 25 per discipline");
  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: profiles, error } = await supabase.from("profiles").select("user_id").limit(1);
  if (error || !profiles?.[0]) throw error || new Error("A profile is required for the smoke test");
  const userId = process.env.SMOKE_USER_ID || profiles[0].user_id;

  for (const discipline of ["indoor", "beach"] as const) {
    const history = [];
    for (let index = 0; index < count; index += 1) {
      const startedAt = Date.now();
      const question = await generateGroundedQuizQuestion({
        supabase,
        userId,
        discipline,
        refereeLevel: "level_1",
        difficulty: "basic",
        topic: index % 2 === 0 ? "service_and_service_order" : "playing_actions",
        flow: "adaptive",
        sessionHistory: history,
      });
      history.unshift(toStructuredHistory(question));
      console.info(JSON.stringify({
        discipline,
        number: index + 1,
        ruleId: question.ruleId,
        style: question.questionStyle,
        sourceChunks: question.sourceChunkIds,
        elapsedMs: Date.now() - startedAt,
      }));
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
