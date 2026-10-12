import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("AI architecture guards", () => {
  it("has no legacy AI provider or runtime embedding dependency", () => {
    const files = [
      "package.json", ".env.example", "lib/ai-config.ts", "lib/llm.ts", "lib/rag.ts", "lib/quiz-generation.ts",
      "app/api/generate-question/route.ts",
      "app/api/learn/module-question/route.ts", "app/api/embed-rules/route.ts",
    ];
    const source = files.map((file) => readFileSync(resolve(process.cwd(), file), "utf8")).join("\n");
    expect(source).not.toMatch(/GEMINI|@ai-sdk\/google|gemini-embedding|embedText|embedChunks|query_embedding/i);
    expect(source).toContain("https://api.deepseek.com");
  });

  it("has no tutor API, UI, state helper, or legacy lessons endpoint", () => {
    for (const file of [
      "app/api/chatbot/route.ts",
      "components/floating-chat.tsx",
      "lib/chatbot-context.ts",
      "lib/video-evaluation.ts",
      "app/api/lessons/route.ts",
      "scripts/seed-lessons.sql",
    ]) {
      expect(existsSync(resolve(process.cwd(), file)), file).toBe(false);
    }
    const shell = readFileSync(resolve(process.cwd(), "components/app-shell.tsx"), "utf8");
    expect(shell).not.toMatch(/FloatingChat|\/api\/chatbot|tutor/i);
    const bootstrap = readFileSync(resolve(process.cwd(), "supabase.sql"), "utf8");
    expect(bootstrap).not.toMatch(/rules_embeddings|match_rules|public\.lessons/);
  });

  it("rate-limits every API by IP and every authenticated identity by user", () => {
    const auth = readFileSync(resolve(process.cwd(), "lib/auth.ts"), "utf8");
    const admin = readFileSync(resolve(process.cwd(), "lib/admin.ts"), "utf8");
    expect(auth).toContain("enforceIpApiRateLimit");
    expect(auth).toContain("enforceAuthenticatedApiRateLimit");
    expect(admin).toContain("enforceIpApiRateLimit");
    expect(admin).toContain("enforceAuthenticatedApiRateLimit");

    const apiRoot = resolve(process.cwd(), "app/api");
    const routeFiles = readdirSync(apiRoot, { recursive: true, encoding: "utf8" })
      .filter((file) => file.endsWith("route.ts"));
    expect(routeFiles.length).toBeGreaterThan(0);
    for (const file of routeFiles) {
      const source = readFileSync(resolve(apiRoot, file), "utf8");
      expect(source, file).toMatch(/requireUserFromRequest|requireAdminFromRequest|getRequestIdentity/);
    }
  });

  it("enforces an LLM budget inside the provider boundary", () => {
    const source = readFileSync(resolve(process.cwd(), "lib/llm.ts"), "utf8");
    expect(source).toContain("await enforceLLMBudget");
    expect(source.indexOf("await enforceLLMBudget")).toBeLessThan(source.indexOf("await fetch"));
  });

  it("keeps module generation quota protection", () => {
    const source = readFileSync(resolve(process.cwd(), "app/api/learn/module-question/route.ts"), "utf8");
    expect(source).toContain("enforceGenerationQuota");
    expect(source).toContain('feature: "module_question"');
  });

  it("keeps every quiz-generation route authenticated and grounded", () => {
    for (const file of [
      "app/api/generate-question/route.ts",
      "app/api/learn/module-question/route.ts",
      "app/api/quiz-sessions/route.ts",
    ]) {
      const source = readFileSync(resolve(process.cwd(), file), "utf8");
      expect(source, file).toContain("requireUserFromRequest(request)");
      expect(source, file).toContain("generateGroundedQuizQuestion");
      expect(source, file).toContain("enforceGenerationQuota");
      expect(source, file).not.toMatch(/chatbot|\/api\/chatbot|FloatingChat/i);
    }
  });

  it("keeps assigned-quiz preplanning, bounded concurrency, and hidden answers", () => {
    const source = readFileSync(resolve(process.cwd(), "app/api/quiz-sessions/route.ts"), "utf8");
    expect(source).toContain("planGroundedQuizBlueprints");
    expect(source).toContain("mapWithConcurrency");
    expect(source).toContain("AI_CONFIG.novelty.assignedConcurrency");
    expect(source).toContain("publicQuizQuestion");
  });

  it("keeps module discipline and ruleset mappings", () => {
    const source = readFileSync(resolve(process.cwd(), "app/api/learn/module-question/route.ts"), "utf8");
    expect(source).toContain('return { discipline: "beach", rulesets: ["beach"] }');
    expect(source).toContain('rulesets: ["rallyball_4v4", "rallyball_unspecified"]');
    expect(source).toContain('rulesets: ["rallyball_6v6", "rallyball_unspecified"]');
    expect(source).toContain('return { discipline: "indoor", rulesets: ["standard_indoor"] }');
  });

  it("keeps assigned ownership, schedule, blueprint, difficulty, and session checks", () => {
    const source = readFileSync(resolve(process.cwd(), "app/api/quiz-sessions/route.ts"), "utf8");
    expect(source).toContain('.eq("user_id", user.userId)');
    expect(source).toContain("program.start_at");
    expect(source).toContain("program.due_at");
    expect(source).toContain("expandTopicBlueprint");
    expect(source).toContain("allocateDifficulties");
    expect(source).toContain('status: "generating"');
    expect(source).toContain('status: "ready"');
  });

  it("keeps answer submission and grading authenticated, atomic, and server-side", () => {
    const assigned = readFileSync(resolve(process.cwd(), "app/api/quiz-sessions/[id]/submit/route.ts"), "utf8");
    expect(assigned).toContain("requireUserFromRequest(request)");
    expect(assigned).toContain("gradeStoredAnswers");
    expect(assigned).toContain('.eq("user_id", user.userId)');
    expect(assigned).toContain('.in("status", ["ready", "in_progress"])');
    expect(assigned).toContain('status: "submitting"');
    expect(assigned).toContain('status: "submitted"');

    const adaptive = readFileSync(resolve(process.cwd(), "app/api/quiz-attempt/route.ts"), "utf8");
    expect(adaptive).toContain("requireUserFromRequest(request)");
    expect(adaptive).toContain('.is("answered_at", null)');
    expect(adaptive).toContain("parsed.data.selected_option === question.answer");
  });

  it("keeps client roles locked out of tables that hold answers, scores, and passes", () => {
    const migrationDir = resolve(process.cwd(), "supabase/migrations");
    const lockdown = readdirSync(migrationDir).find((file) => file.includes("lockdown_client_access"));
    expect(lockdown).toBeDefined();
    const migration = readFileSync(resolve(migrationDir, lockdown!), "utf8");
    expect(migration).toContain("revoke all on all tables in schema public from anon, authenticated");
    for (const policy of [
      "user read own generated questions",
      "user read own session questions",
      "auth read video_questions",
      "user manage mcq_challenge_entries",
      "user insert own module passes",
      "user manage quiz_attempts",
    ]) {
      expect(migration, policy).toContain(`drop policy if exists "${policy}"`);
    }

    const bootstrap = readFileSync(resolve(process.cwd(), "supabase.sql"), "utf8");
    expect(bootstrap).toContain("revoke all on all tables in schema public from anon, authenticated");
    expect(bootstrap).not.toMatch(/create policy "user (manage|insert|update)/);
  });

  it("scores the weekly challenge from server time only", () => {
    const source = readFileSync(resolve(process.cwd(), "app/api/challenge/route.ts"), "utf8");
    expect(source).toContain("video_challenge_starts");
    expect(source).toContain('.eq("kind", "challenge")');
    expect(source).not.toMatch(/body\.time_taken_ms|time_taken_ms\s*[,}]\s*=\s*body/);
  });

  it("prunes AI telemetry on a schedule", () => {
    const migrationDir = resolve(process.cwd(), "supabase/migrations");
    const retention = readdirSync(migrationDir).find((file) => file.includes("ai_telemetry_retention"));
    expect(retention).toBeDefined();
    const migration = readFileSync(resolve(migrationDir, retention!), "utf8");
    expect(migration).toContain("cron.schedule");
    expect(migration).toContain("delete from public.ai_request_telemetry");
    expect(migration).toContain("delete from public.quiz_generation_telemetry");
  });
});
