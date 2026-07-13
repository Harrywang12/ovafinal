# 1. Application Overview

* Product purpose: Volleyball referee training app with adaptive AI multiple-choice questions, module learning, video practice, weekly video challenges, dashboards, and admin content management.
* Main user types and roles: authenticated learner/referee and administrator. Admins are email-based via `admin_users` plus `ADMIN_EMAILS`.
* Current development status: functional Next.js app builds successfully, but several features are partial or schema-dependent. `npm run build` passes. `npm run lint` fails because `next lint` is no longer a valid command in this installed Next version.
* Tech stack: Next.js App Router, React 18, TypeScript, Tailwind, React Query, Supabase, OpenAI, pgvector, `pdf-parse`.
* Frontend framework: Next.js app directory pages and client components.
* Backend framework: Next.js route handlers under `app/api`.
* Database: Supabase Postgres with `pgvector`.
* Authentication system: Supabase Auth email/password. User profile level is stored in `profiles`.
* Hosting/deployment: Vercel, configured by `vercel.json`, region `iad1`, per-route max durations.
* External services/APIs: Supabase Auth/Postgres/Storage, OpenAI chat completions and embeddings.
* Environment variables found: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENAI_API_KEY`, optional `ADMIN_EMAILS` / `ADMIN_EMAIL`.

Key refs: `package.json`, `README.md`, `vercel.json`, `lib/supabase.ts`, `lib/llm.ts`, `lib/admin.ts`.

# 2. Main User Flows

* Registration/login: `/login` uses Supabase password auth. Signup stores `referee_level` in Supabase user metadata and upserts `profiles` when a session exists. Refs: `app/login/page.tsx:44`, `app/login/page.tsx:75`.
* Onboarding/profile: only referee level selection exists at signup. No separate onboarding wizard found. Profile is normalized/upserted server-side on authenticated API calls. Ref: `lib/auth.ts:17`.
* Referee profile setup: levels `level_1` through `level_4`; mapped to beginner/intermediate/hard. Ref: `lib/learning.ts:44`.
* Indoor vs beach selection: learning page has category tabs for indoor, 4v4, 6v6, beach; practice/challenge video pages have indoor/beach toggles. Adaptive quiz does not let user explicitly choose indoor/beach. Refs: `app/learn/page.tsx:34`, `app/practice/page.tsx:30`, `app/challenge/page.tsx:32`.
* Referee level selection: signup only; admin can view levels but I did not find admin level-editing routes.
* Starting a quiz: adaptive `/quiz` “Generate Question” calls `POST /api/generate-question`; module “Start Quiz” calls `POST /api/learn/module-question`. Refs: `app/quiz/page.tsx:76`, `components/learn/module-quiz.tsx:57`.
* Answering/feedback/completion: answers are graded client-side by string equality for AI MCQ, saved to `/api/quiz-attempt` or `/api/learn/module-attempt`, then explanation is shown immediately. Module pass is 7 correct in latest 10; adaptive assignment completion is quota plus required percent. Refs: `app/quiz/page.tsx:125`, `app/api/quiz-attempt/route.ts:17`, `app/api/learn/module-attempt/route.ts:76`.
* Viewing progress: `/dashboard` calls `/api/dashboard`; `/learn` calls `/api/learn/progress`. Refs: `app/dashboard/page.tsx:183`, `app/api/dashboard/route.ts:87`.
* Admin workflows: `/admin` lists/deletes video questions, assigns modules, assigns adaptive quiz quotas, manages admin emails; `/admin/new` uploads and creates video scenarios. Refs: `app/admin/page.tsx:112`, `app/admin/new/page.tsx:15`.

# 3. Quiz Generation Flow

Adaptive quiz sequence:

1. User clicks “Generate Question” or “New Question” in `/quiz`.
2. Frontend calls `POST /api/generate-question` with `{ recent_questions: askedQuestions.slice(-15) }` and bearer token.
3. Route validates env, parses optional `difficulty`, `question_level`, `recent_questions`.
4. If authenticated, `requireUserFromRequest` validates token, upserts profile, gets referee level.
5. `getOrCreateAdaptiveQuizState` overrides requested difficulty with stored adaptive difficulty.
6. Referee level is indirectly used through initial adaptive state; current difficulty maps to `question_level`.
7. Indoor/beach is not passed from UI. Route randomly selects topics from a mixed topic list containing indoor, rallyball, and beach topics.
8. Difficulty is selected from adaptive state. Unauthenticated requests can pass difficulty, but `/quiz` is inside `AuthGuard`.
9. Topics: three random `REFEREE_TOPICS`.
10. RAG: searches each topic with `searchRules(topic, 4)`, dedupes chunks, sends up to 5 chunks. Static module context is added only if selected topics imply 4v4, 6v6, or beach; otherwise if no RAG chunks exist, all static module content is used.
11. Generates one question per API call, not a full quiz.
12. AI provider/model: OpenAI chat completions through `openai` SDK. Adaptive route uses `gpt-4o`, temperature `0.85`, no `max_tokens`. Module route uses `gpt-4o-mini` for beginner, `gpt-4o` otherwise, temperature `0.8` or `0.9`.
13. Expected output: JSON object with `question`, exactly 4 `options`, `answer`, `explanation`, `rule_reference`.
14. Validation: JSON parse, required fields, option count, answer coerced to a matching option or first option. No Zod schema here.
15. Retry/failure: up to 2 generation attempts. Duplicate candidates may still be returned as least-similar fallback. Parse failure returns `500` with raw model response.
16. Storage: generated question is not stored at generation time. It is stored when the user submits an answer to `/api/quiz-attempt`.
17. Return: JSON question plus `context: finalChunks`.

Core refs: `app/api/generate-question/route.ts:241`, `app/api/generate-question/route.ts:318`, `app/api/generate-question/route.ts:413`, `app/api/generate-question/route.ts:469`.

Current adaptive prompt template, with dynamic values preserved:

```text
SYSTEM:
You are an elite volleyball rules expert covering FOUR formats: Indoor 6v6, 4v4 Rallyball (OVA), 6v6 Rallyball (OVA), and Beach Volleyball (FIVB). Your task is to create ONE highly specific, practical quiz question that will genuinely help players and referees improve their knowledge.

IMPORTANT FORMAT AWARENESS:
- If the context mentions "4v4 Rallyball" or "Tripleball" or "diamond/square formation", create a question about 4v4 Rallyball rules specifically.
- If the context mentions "6v6 Rallyball" or "designated setter position" or "free ball tosser", create a question about 6v6 Rallyball rules specifically.
- If the context mentions "beach volleyball" or "sand court" or "2-player team" or "block counts as hit", create a question about Beach Volleyball rules specifically.
- Otherwise, create a question about standard Indoor Volleyball rules.
- ALWAYS clearly indicate which format the question is about in the question text.

CRITICAL REQUIREMENTS:
1. The question MUST be based on a realistic game situation
2. Include specific details: player positions, game score context if relevant, exact actions
3. All 4 options must be plausible - no obviously wrong answers
4. The correct answer MUST be one of the exact option strings you provide
5. The explanation must cite the specific rule or regulation

QUESTION FOCUS AREA: {focusArea}
SCENARIO TYPE: {randomScenarioType}
DIFFICULTY: {safeDifficulty}
{difficultyGuidelines[safeDifficulty]}
QUESTION BANK LEVEL: {questionLevel}
{levelGuidelines[questionLevel]}

RANDOMIZATION SEED: {randomSeed}

STRICT JSON FORMAT:
{
  "question": "...",
  "options": ["Option A - ...", "Option B - ...", "Option C - ...", "Option D - ..."],
  "answer": "Option X - ...",
  "explanation": "...",
  "rule_reference": "Rule X.X.X - Brief rule title"
}

USER:
Based on these official volleyball rules, create a {safeDifficulty} difficulty question.

Generation attempt: {attempt + 1}. Use a substantially different scenario, rule detail, and answer pattern than any previously asked or rejected item.

{combinedContext}{avoidBlock}

Remember: Return ONLY valid JSON. The "answer" field must be the COMPLETE text of one of your options...
```

# 4. Dynamic Question Generation

* Adaptive and module quiz questions are dynamically generated by AI one at a time.
* Fixed question bank: no fixed text bank for AI MCQ found. Static learning content exists in `lib/module-content.ts`; video questions are admin-authored fixed records.
* Reuse: AI questions can be reused if duplicate checks miss or fallback returns a duplicate candidate.
* Generation scope: per user request/per question, not prebuilt globally.
* Generated before/during quiz: generated on demand before each displayed question.
* AI generates correct answer, explanation, rule reference, and distractors.
* Citations are generated as plain `rule_reference` text; no citation verification found.
* Caching: no generated-question cache found.
* Fallback content: generation falls back to static module context if RAG fails or has no chunks; no fallback question bank.

Refs: `app/api/generate-question/route.ts:323`, `app/api/learn/module-question/route.ts:162`, `lib/module-content.ts:33`.

# 5. Repetition Prevention

* Stored history: `quiz_question_history` stores `user_id`, `scope`, `module_id`, `question_level`, `question_text`, `question_signature`, `created_at`.
* Per-user: yes. Global: no.
* Prompt history: up to 75 recent prior/rejected questions included in prompt.
* Text matching: normalized SHA-256 exact signature and token cosine similarity over normalized words.
* Normalization: lowercase, non-alphanumeric collapsed to spaces.
* Embeddings: removed by migration; no semantic embeddings for history now.
* Topic/rule/scenario pattern tracking: not stored separately.
* Threshold: `SIMILARITY_THRESHOLD = 0.78`; compare limit 750; history pruned after 1000 per scope.
* Regeneration: max 2 attempts. If both duplicate, least-similar duplicate candidate is returned.
* If uniqueness cannot be generated: route returns least-similar duplicate if available, otherwise parse error.

Refs: `lib/quiz-question-history.ts:30`, `lib/quiz-question-history.ts:145`, `app/api/generate-question/route.ts:461`, `supabase/migrations/20260709000001_lightweight_quiz_question_history.sql:1`.

# 6. Source Material and Rulebook Use

* Supported upload file types for rulebook route: code accepts any multipart file and sends it to `rules`; embed route assumes PDF and uses `pdf-parse`.
* Storage: Supabase Storage bucket `rules`; chunks in `rules_embeddings`.
* Text extraction: `pdf-parse`.
* Chunking: 800 words, 80 overlap.
* Embeddings: OpenAI `text-embedding-3-small`, vector dimension 1536.
* Vector search: Supabase RPC `match_rules`, cosine similarity, limit default 5.
* Metadata: only `chunk` and `embedding`; no document id, filename, page, section, format, level, rule number, or case metadata in schema.
* Indoor/beach source separation: not in embeddings schema. Static module content has categories.
* Retrieval chunks sent to AI: adaptive route up to 5 final chunks; module route 4 chunks; chatbot 4 chunks; lessons 3 chunks.
* Source links shown to users: AI route returns context chunks to frontend but `/quiz` does not render source links. It renders only `rule_reference`.
* Citation verification: not found.
* No relevant source behavior: adaptive uses static content fallback; can answer using static context without retrieved evidence.
* Visible configured/local documents: `public/rulebook-compressed.pdf`, `public/6v6and4v4rules.pdf`, `public/beachrules.pdf`, `public/additional4v4and6v6info.pdf`, text files `rulebook.txt`, `beach-volleyball-rules.txt`, `4v4-rallyball-rules.txt`, `6v6-rallyball-rules.txt`, `scorekeeping.txt`.

Refs: `app/api/upload-rules/route.ts:8`, `app/api/embed-rules/route.ts:10`, `lib/rag.ts:9`, `supabase.sql:6`.

# 7. Question and Answer Validation

Existing checks:

* JSON parse and required fields for AI quiz.
* Exactly 4 options.
* Answer coerced to one option if mismatch.
* Video questions validate four non-empty options and `correct_option_index` 0..3.
* Module/adaptive attempts require `correct` boolean from client.

Missing checks found:

* Duplicate-option validation for AI questions.
* Citation validation.
* Rule-reference validation.
* Answer/explanation consistency.
* Second-model verification.
* Confidence scoring.
* Human approval.
* Admin review of AI-generated questions.
* User flagging/reporting.
* Deterministic correctness validation.

Refs: `app/api/generate-question/route.ts:202`, `app/api/learn/module-question/route.ts:73`, `app/api/admin/video-questions/route.ts:76`.

# 8. Supported Question Types

* Single-answer multiple choice: implemented for adaptive AI, module AI, video practice, and weekly challenge. Data: `question`, `options[]`, `answer` or `correct_option_index`. Grading: client string equality for AI quizzes; server index equality for video. Feedback is immediate.
* Multiple-select, true/false as distinct type, written response, matching, ordering, image questions, video written-response, timestamped video with open ruling, and first/second referee responsibility as a structured type: not implemented as distinct question types.
* Scenario questions: implemented as prompt style and text content, not a separate schema type.
* Video timestamped MCQ: implemented with `pause_at_seconds` and `answer_window_seconds`.

Refs: `app/quiz/page.tsx:313`, `components/learn/module-quiz.tsx:250`, `app/practice/page.tsx:373`, `supabase.sql:219`.

# 9. Quiz Configuration

* Number of questions: adaptive generates one at a time; admin quiz quota defaults UI to 50 but is configurable per assigned learner. Module pass uses latest 10 attempts.
* Difficulty: adaptive state `easy|medium|hard`; module uses referee-level-derived `beginner|intermediate|hard`; videos have admin difficulty.
* Topic selection: adaptive random topic list; module random focus lesson.
* Referee level: stored in profile; signup selectable.
* Indoor or beach: learning category and video category toggles exist; adaptive quiz does not expose selection.
* Pass mark: module 7/10 and 70%; adaptive assignment required percent configurable.
* Time limit: AI text quiz none; video answer window default by difficulty or admin configured.
* Attempt limit: video one attempt per question enforced; AI quiz no per-question attempt limit beyond one UI submission per generated question.
* Retakes: AI can generate more questions; module pass keeps passed record. Video repeat blocked.
* Start date/due date/deadlines: not found.
* Immediate feedback: yes.
* Explanation visibility: immediate after answer; no admin-config toggle.
* Randomization: random topics, chunks, seed, focus lesson.
* Seasonal requirements/upgrade-candidate assignments: not found.

Refs: `lib/learning.ts:3`, `lib/quiz-assignments.ts:39`, `app/api/practice/route.ts:67`.

# 10. User Progress and Reporting

Stored/displayed:

* AI adaptive attempts in `quiz_attempts`; module attempts in `module_quiz_attempts`; video attempts in `video_question_attempts`; challenge scores in `mcq_challenge_entries`.
* Scores/pass/completion for modules and quiz assignments.
* Required module count and quiz quota.
* Average score in admin learning report.
* Last activity for module learning.
* Referee level, indoor/beach module categories, video category where schema supports it.
* Admin reporting lists learners, module progress, assignments, quiz assignment progress.

Not found:

* CSV/Excel export.
* Reminders.
* Deadlines/overdue.
* Weak topics/frequently missed rules.
* Organization/region/association.

Refs: `app/api/dashboard/route.ts:320`, `app/api/admin/learning-progress/route.ts:53`.

# 11. Admin Features

Fully implemented:

* Admin access check/list/add/remove via email.
* Video question list/create/delete; patch route exists.
* Video upload to `practice-clips`.
* Module assignment.
* Adaptive quiz quota assignment.
* Learning progress report.

Partially implemented:

* Indoor/beach video assignment/category: UI/routes use `category`, but visible SQL migrations do not create `video_questions.category`.
* Editing video questions: PATCH route exists, but I did not find a full edit UI in the inspected admin page.
* Report analytics: summaries exist; no export.

Missing:

* User management beyond reports.
* Role management beyond admin emails.
* Referee-level assignment.
* Deadline management.
* Source-document management UI.
* Prompt management.
* AI model configuration UI.
* Viewing/editing/retiring/blocking AI-generated questions.
* Flagged question review.
* Audit logs.

Refs: `app/admin/page.tsx:124`, `app/api/admin/admins/route.ts:10`, `app/api/admin/video-questions/route.ts:22`.

# 12. Case Studies, Images, and Video

* Text-based case studies/scenarios: AI prompt asks for realistic scenarios; static module lessons include scenario-like text.
* Casebook-specific scenarios: no separate casebook entity found.
* Image uploads/image quiz questions: not found.
* Video uploads: admin upload to Supabase `practice-clips`.
* External video links: admin form accepts pasted public URL.
* Playback: HTML `<video>` with controls.
* Start/end timestamps: only pause timestamp exists; no end timestamp.
* Pausing before decision: implemented with `pause_at_seconds`.
* Questions attached to clips: `video_questions` holds options, correct index, explanation, rule reference.
* Official ruling reveal: explanation/correct option shown after submit.
* Mobile playback: responsive UI exists; no explicit mobile playback test found.
* Upload limits/formats: migration bucket says 50MB and mp4/quicktime/avi; UI accepts mp4/webm/quicktime; upload route does not enforce MIME/size itself.

Refs: `app/admin/new/page.tsx:217`, `app/practice/page.tsx:373`, `supabase/migrations/20260201000000_video_mcq_challenges.sql:21`.

# 13. Data Model

Relevant entities:

* `auth.users`: Supabase-managed users.
* `profiles`: `user_id`, `email`, `referee_level`, timestamps.
* `admin_users`: email allowlist.
* `rules_embeddings`: `id`, `chunk`, `embedding`.
* `quiz_attempts`: `user_id`, `question` JSON, selected option, correct.
* `quiz_question_history`: per-user normalized AI question history.
* `quiz_adaptive_state`: current difficulty and streaks.
* `quiz_assignments`: quota, required percent, assigned_by, assigned_at, completed_at.
* `module_lesson_progress`: viewed lessons.
* `module_quiz_attempts`: module, question level, question JSON, selected option, correct.
* `module_passes`: module pass summary.
* `module_assignments`: admin-assigned modules.
* `lessons`: old/simple lesson table exists but current learning content is static `moduleContent`.
* `video_questions`: admin-authored MCQ clips.
* `video_question_attempts`: one attempt per video question per user via unique index.
* `mcq_challenge_entries`: challenge score entries.
* `weekly_leaderboard_mcq`: view.

No separate tables found for roles, topics, rules, source documents, source chunks with metadata, citations, reports, flags, deadlines.

Refs: `supabase.sql:6`, `supabase.sql:37`, `supabase.sql:122`, `supabase.sql:219`.

# 14. Security and Reliability

* Auth: Supabase bearer token checks in protected routes; client `AuthGuard` protects pages.
* Authorization: admin routes use `requireAdminFromRequest`.
* RLS: migrations enable RLS on many tables and define own-user/admin policies.
* Server routes use service key, so application-level auth checks are critical.
* Input validation: ad hoc route checks; Zod only found in admin email route.
* Rate limiting: not found.
* AI API abuse protection: auth required for UI routes, but no rate/cost quotas found.
* File upload validation: content-type multipart checked; video upload lacks server MIME/size enforcement; rule upload accepts arbitrary file type before PDF parse.
* Data isolation: route filters by authenticated `user_id`; DB policies also present for many tables.
* Logging/error monitoring: console warnings/errors only; no external monitoring found.
* Retry logic: AI generation has 2 attempts; video evaluation helper has retries but appears unused by current video MCQ routes.
* Timeout handling: Vercel max durations configured for several AI routes.
* Cost controls: not found.
* Prompt-injection defenses: prompts say use snippets as ground truth, but no document sanitization or citation verification found.
* Tests: none found.

Refs: `components/auth-guard.tsx`, `lib/admin.ts:83`, `app/api/admin/admins/route.ts:6`, `vercel.json:5`.

# 15. Current Tests

* Unit tests: none found.
* Integration tests: none found.
* End-to-end tests: none found.
* AI output, quiz generation, duplicate detection, citation, reporting tests: none found.
* Verification run: `npm run build` passed. `npm run lint` failed because `next lint` interpreted `lint` as a project directory under Next 16.1.6.

# 16. Known Issues and Technical Debt

* README says Next.js 14, package uses Next 16.1.6.
* `video_questions.category` is used in app/routes but absent from visible SQL migrations/schema.
* `next.config.mjs` comments mention Next 14+ and uses experimental `serverActions`.
* Several claims in UI say “grounded/cited,” but citation verification is not implemented.
* Adaptive quiz has no user-controlled indoor/beach selection despite beach topics being random.
* AI answer validation can silently fall back to first option if model answer does not match.
* No test suite.
* No rate limiting/cost controls.
* `app/api/lessons` exists and generates quiz JSON string, but current module UI uses `/api/learn/module-question`; route appears legacy/unused by current flow.
* `lib/video-evaluation.ts` evaluates written rulings with AI, but current video practice/challenge uses admin-authored MCQ index grading.

Refs: `README.md:3`, `package.json:16`, `app/api/admin/video-questions/route.ts:113`, `lib/video-evaluation.ts:25`.

# 17. Current Readiness for Beach Referee Quizzes

| Item | Status | Code-based explanation |
|---|---|---|
| Dynamically generated beach quizzes | Partial | Beach topics/static module exist, but adaptive quiz randomly selects topics; no beach selection payload. |
| Beach Level 1 content | Partial | Beach static module exists; level is general referee level, not beach-specific. |
| Beach Level 2 content | Partial | Same as above; no beach-specific level taxonomy. |
| Non-repetitive questions | Partial | Per-user text similarity/history exists but fallback can return duplicate. |
| Rulebook-grounded answers | Partial | RAG/static context used; no citation verification. |
| Answer explanations | Implemented | AI/video explanations shown. |
| Reliable citations | Partial | `rule_reference` text exists; not verified. |
| Quiz-completion tracking | Partial | Quotas and module passes exist; no beach-specific completion. |
| Deadlines | Not implemented | No fields/routes found. |
| Admin reporting | Partial | Learning and quiz reports exist; no beach-specific report/export. |
| Mobile use | Cannot determine | Responsive classes exist; no mobile test evidence. |
| Case-study questions | Partial | Scenario prompting exists; no case-study entity. |
| Video questions | Partial | Admin-authored indoor/beach category intended, but schema for `category` missing in visible migrations. |

# 18. File and Code Reference Index

Major reference points:

* Auth/profile/admin: `lib/auth.ts:17`, `lib/admin.ts:83`, `app/login/page.tsx:75`.
* Adaptive quiz: `app/quiz/page.tsx:76`, `app/api/generate-question/route.ts:241`, `app/api/quiz-attempt/route.ts:17`.
* Module learning: `lib/module-content.ts:33`, `app/learn/page.tsx:34`, `app/api/learn/module-question/route.ts:102`.
* RAG/source: `app/api/embed-rules/route.ts:10`, `lib/rag.ts:21`, `supabase.sql:170`.
* Repetition: `lib/quiz-question-history.ts:145`, `supabase/migrations/20260709000000_quiz_question_history.sql:22`.
* Video practice/challenge: `app/practice/page.tsx:51`, `app/challenge/page.tsx:41`, `app/api/practice/route.ts:23`, `app/api/challenge/route.ts:41`.
* Admin: `app/admin/page.tsx:112`, `app/admin/new/page.tsx:15`.
* Deployment/config: `vercel.json:1`, `next.config.mjs:1`.

# 19. Final Feature Matrix

| Feature | Current status | Where implemented | Important limitations | Confidence in assessment |
|---|---|---|---|---|
| Supabase auth | Complete | `login`, `auth.ts` | Email/password only found | High |
| Referee levels | Partial | `profiles`, `learning.ts` | No admin editing found | High |
| Adaptive AI quiz | Partial | `/quiz`, `/api/generate-question` | One question at a time; no format selector | High |
| Module quizzes | Partial | `ModuleQuiz`, `/api/learn/module-question` | One question at a time; AI validation light | High |
| Beach learning content | Partial | `module-content.ts`, `/learn` | Static module only, no beach-specific levels | High |
| RAG rulebook search | Partial | `rules_embeddings`, `rag.ts` | No source metadata/citation verification | High |
| Repetition prevention | Partial | `quiz_question_history` | Text-only, can return duplicate fallback | High |
| Quiz assignments | Partial | `quiz_assignments`, admin page | No deadlines/start dates | High |
| Module assignments | Complete | `module_assignments`, admin page | No due dates | High |
| Video practice MCQ | Partial | `/practice`, `/api/practice` | Requires admin-authored records | High |
| Weekly challenge | Partial | `/challenge`, `mcq_challenge_entries` | Weekly is flag-based; no scheduler found | High |
| Indoor/beach video category | Unclear | UI/routes | Schema column absent in visible SQL | High |
| Admin video upload | Partial | `/admin/new`, upload route | Server upload lacks explicit MIME/size checks | High |
| Admin reports | Partial | `/api/admin/learning-progress` | No CSV/export/filtering beyond UI basics | High |
| Prompt/model config UI | Missing | None found | Hard-coded prompts/models | High |
| Source document management UI | Missing | Upload/embed API only | No admin UI found | High |
| Flags/review queue | Missing | None found | No tables/routes | High |
| Tests | Missing | None found | Build only verified | High |
| Vercel deployment config | Complete | `vercel.json` | Uses `vercel.json`, not `vercel.ts` | High |
