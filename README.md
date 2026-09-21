# Volleyball Referee Training (Serverless, Vercel)

Rulebook-grounded volleyball officiating trainer built with Next.js 16 (App Router), TailwindCSS, Supabase, and DeepSeek. All backend logic lives in Next.js route handlers.

## Stack
- Next.js 16 App Router, React Query for client data fetching/state
- TailwindCSS styling
- Supabase Postgres + Auth + Storage, PostgreSQL FTS, and `pg_trgm`
- DeepSeek's official API (`deepseek-flash`) for language generation and grounding verification
- Deterministic metadata retrieval and novelty planning; no external embedding API
- Serverless API routes in `app/api/*` (no separate backend)

## Environment
Copy `.env.example` to `.env.local` for local dev or set in Vercel Project Settings:
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DEEPSEEK_API_KEY=
ADMIN_EMAILS=
```

In Supabase Auth → URL Configuration, set the production site URL and allow
`http://localhost:3000/auth/callback` plus your production
`https://<domain>/auth/callback` URL. Password-reset emails return through this
callback before opening `/reset-password`.

## Database / Storage Setup
1. For a fresh project, run `supabase.sql`, then apply every file in `supabase/migrations` in timestamp order. Existing projects should apply only unapplied migrations.
2. Create Storage buckets:
   - `rules` (for rulebook PDFs)
   - `practice-clips` (for MP4 practice clips)
3. Optional policies: allow authenticated inserts/selects on tables used from client (e.g., `quiz_attempts`, `video_attempts`). Server routes use the service key for admin writes.

### Administrator access

Apply the latest Supabase migrations to create the `admin_users` table. Existing administrators can then add or remove admin emails from **Admin → Admin access**.

For bootstrap or emergency access, set `ADMIN_EMAILS` to a comma-separated list:

```bash
ADMIN_EMAILS=admin@example.com,second-admin@example.com
```

Database-managed admins can be removed in the UI. Environment-managed admins must be removed from `ADMIN_EMAILS`.

## Local Development
```
pnpm install   # or npm install
pnpm dev       # or npm run dev
```
Open `http://localhost:3000`.

## Deploy to Vercel
1. `vercel` → import this repo.
2. Set the environment variables above.
3. `vercel deploy` (build uses `next build`; API routes deploy as serverless functions).

## Feature Endpoints
- `POST /api/upload-rules` — admin-authenticated PDF upload, limited to 25 MB.
- `POST /api/embed-rules` — compatibility-named, admin-authenticated indexing endpoint; parses PDFs and writes rule-aware chunks and metadata without embeddings.
- `POST /api/generate-question` — authenticated `{ discipline, difficulty?, topic? }`; server resolves referee level and returns a stored MCQ without its answer.
- `POST /api/quiz-attempt` — `{ question_id, selected_option }`; grades the stored adaptive question server-side.
- `GET /api/quiz-programs` — returns a learner's assigned programs, deadlines, status, and sessions.
- `POST /api/quiz-sessions` — creates and freezes a complete assigned quiz from its program blueprint.
- `POST /api/quiz-sessions/[id]/submit` — grades all stored session answers server-side.
- `POST /api/question-flags` — reports an adaptive or session question for admin review.
- `/api/admin/quiz-programs*` — protected program CRUD, assignment, reporting, and CSV export APIs.
- `/api/admin/question-flags*` — protected question-report review APIs.
- `GET/POST /api/practice` — `GET ?difficulty=` returns random clip metadata; `POST` logs attempt.
- `GET/POST /api/challenge` — fetch weekly extreme clip + leaderboard or submit weekly score.
- `/api/admin/video-questions*` — admin-protected video-question CRUD.
- `POST /api/admin/upload-video` — admin-protected video upload, limited to 100 MB.

## Uploading Rule PDFs and Videos
1. Upload rulebook PDF with an admin bearer token:
   ```
   curl -X POST -H "Authorization: Bearer <admin-token>" -F "file=@/path/to/rulebook.pdf" https://your-vercel-app.vercel.app/api/upload-rules
   ```
   Note the `path` in the response.
2. Index the rules with required source metadata (the route name is retained for compatibility):
   ```
   curl -X POST -H "Content-Type: application/json" \
     -H "Authorization: Bearer <admin-token>" \
     -d '{"path":"rules/<returned-path>","title":"Official Beach Volleyball Rules","discipline":"beach","documentType":"official_rulebook","effectiveYear":"2025"}' \
     https://your-vercel-app.vercel.app/api/embed-rules
   ```
3. Upload practice clips:
   - **Option A: Via API (Recommended)**
     ```bash
     curl -X POST https://your-vercel-app.vercel.app/api/admin/video-questions \
       -H "Authorization: Bearer <admin-token>" \
       -H "Content-Type: application/json" \
       -d '{
         "kind": "practice",
         "difficulty": "easy",
         "video_url": "https://your-storage.com/clip.mp4",
         "pause_at_seconds": 12,
         "options": ["Out", "In", "Touch", "Replay"],
         "correct_option_index": 0,
         "explanation": "Ball clearly lands outside sideline",
         "rule_reference": "Rule 8.4"
       }'
     ```
   - **Option B: Via Supabase SQL**
     ```sql
     insert into video_questions (kind, difficulty, video_url, pause_at_seconds, options, correct_option_index, explanation, rule_reference)
     values ('practice', 'easy', 'https://.../clip.mp4', 12, '["Out","In","Touch","Replay"]'::jsonb, 0, 'Ball clearly lands outside sideline', 'Rule 8.4');
     ```
   
   **Note:** Upload MP4 files to your storage bucket (e.g., `practice-clips` in Supabase Storage) first, then use the public URL in the `video_url` field.

## Managing Migrations
- Apply every migration through `supabase/migrations/20260917000000_production_rate_limits.sql`.
- If an index build reports `memory required is 61 MB, maintenance_work_mem is 32 MB`, rerun the failed migration from this repository. The legacy IVFFlat and newer FTS migrations now use a transaction-local 96 MB allowance; no global database configuration change is needed. The migrations run inside transactions, so a failed run can be retried.
- The migrations add weighted FTS/trigram indexes, transactional blueprint reservations, atomic API/AI budgets, and AI usage telemetry. They also remove the retired tutor's conversation persistence. Legacy vector columns remain nullable for rollback.
- Run `npm run rules:reindex` to rebuild deterministic rule-aware chunks. Reindexing makes no AI or embedding calls.
- Runtime retrieval uses `search_rule_chunks_fts`; legacy vector functions remain only in historical migrations and are not called by production code.

## Notes
- All API routes use the Node.js runtime. DeepSeek calls go directly to `https://api.deepseek.com`.
- Every API request is limited by client IP and authenticated user. DeepSeek additionally has per-user and project-wide call/token ceilings enforced immediately before the provider request. Limits fail closed if the database limiter is unavailable.
- Configure the launch limits in `.env.example` for expected traffic and budget. The defaults allow ordinary quiz use while putting a hard ceiling on automated credit consumption.
- Adaptive hints on the quiz page recommend modules based on missed questions.

## Quick Verification
- `npm run lint` checks code quality with ESLint (Next.js 16 no longer provides `next lint`).
- `npm test` runs mocked unit and integration tests without paid AI calls.
- `npm run build` performs the production Next.js build.
