# Technical Inventory

## Application

- Next.js 16 App Router, React 18, TypeScript, Tailwind CSS, and React Query.
- Next.js route handlers provide the backend; all AI routes use the Node.js runtime.
- Supabase provides Auth, PostgreSQL, and Storage.
- Vercel deployment configuration is in `vercel.json`.

## AI provider

- The only external AI provider is DeepSeek's official API at `https://api.deepseek.com`.
- Every request uses `deepseek-flash` through the single wrapper in `lib/llm.ts`.
- Required secret: `DEEPSEEK_API_KEY`.
- Structured responses are parsed and validated with Zod server-side.
- There is no external embedding generation in ingestion or retrieval.

## Rule ingestion and retrieval

- `POST /api/upload-rules` validates and uploads official PDF rulebooks.
- `POST /api/embed-rules` retains its compatibility route name but performs deterministic PDF parsing and metadata indexing only.
- `scripts/reindex-rule-documents.ts` creates versioned chunks without AI calls.
- `rule_documents` stores source title, discipline, type, year, URL/path, and active index version.
- `rule_chunks` stores text, ruleset, rule/section/case identifiers, page, topic/tags, referee-level bounds, index version, and content hash.
- Runtime retrieval calls `search_rule_chunks_fts`, using weighted PostgreSQL FTS, trigram matching, and strict relational filters.
- Legacy vector columns/functions remain in historical migrations for rollback, but no application runtime calls them.

## Quiz architecture

1. Determine discipline, authorized referee level, topic, difficulty, and ruleset server-side.
2. Retrieve 10–20 eligible chunks using metadata filters.
3. Create deterministic blueprint combinations across chunk, rule, style, scenario type, referee role, and decision type.
4. Rank blueprints against structured learner history and active reservations.
5. Transactionally reserve one blueprint.
6. Ask DeepSeek for one language candidate: question, four options, correct option index, explanation, and literal supporting quote.
7. Combine language with server-owned metadata.
8. Run Zod and deterministic source/discipline/ruleset/duplicate checks.
9. Ask DeepSeek for one compact grounding classification.
10. Store the private question and return a public object without answer, explanation, source evidence, or internal fingerprint.

Retries select and reserve a different conceptual blueprint. No prompt contains prior question history, and no call asks for multiple complete candidates.

Assigned quizzes reserve the complete blueprint collection first, reject conceptual duplicates, generate with bounded concurrency, restore deterministic ordering, and freeze questions in `quiz_session_questions`.

## Answer security

- Adaptive/module questions are stored in `generated_quiz_questions` before delivery.
- Assigned questions are frozen in `quiz_session_questions`.
- Public payloads omit hidden answers and evidence.
- Submission routes load the stored private object and grade option strings deterministically.
- Atomic `answered_at` claims and session status transitions prevent repeated submissions.
- DeepSeek never grades learner multiple-choice answers.

## Quotas and observability

- `consume_rate_limits` atomically evaluates multi-policy fixed windows with deterministic PostgreSQL advisory locks; rejected requests are never partially charged.
- The Next.js proxy limits every API request by client IP, while authentication helpers add per-user minute/day limits to all learner and admin APIs.
- `consume_ai_quota` enforces both per-feature and shared per-user question budgets, preventing adaptive/module buckets from being stacked.
- The central DeepSeek boundary reserves estimated input/output tokens and one actual provider call against per-user and project-wide budgets before every generation, verification, or retry.
- Rate-limit infrastructure fails closed and returns 429 responses with `Retry-After` where generation routes surface the rejection.
- `ai_request_telemetry` records request type, model, tokens, prompt-cache tokens, latency, attempt, and outcome.
- `quiz_generation_telemetry` records first-attempt success and validation, duplicate, and grounding rejection stages.
- Provider secrets, prompts, answers, and source text are not written to telemetry.

## Key configuration defaults

- Quiz generation output: 1,000 tokens.
- Grounding verifier output: 100 tokens.
- Quiz generation attempts: 2.
- Near-duplicate threshold: 0.88.
- Assigned generation concurrency: 3.
- API requests: 180/IP/minute, 120/user/minute, and 5,000/user/day.
- Shared AI questions: 30/user/hour and 100/user/day.
- DeepSeek calls: 60/user/minute, 200/user/day, and 5,000/project/day.
- DeepSeek estimated tokens: 250,000/user/day and 5,000,000/project/day.

See `.env.example` and `lib/ai-config.ts` for configurable limits.
