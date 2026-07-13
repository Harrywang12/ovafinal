# Volleyball Referee Training (Serverless, Vercel)

RAG-powered volleyball officiating trainer built with Next.js 16 (App Router), TailwindCSS, Supabase (Postgres, Auth, Storage, pgvector), and OpenAI. All backend logic lives in Vercel serverless API routes.

## Stack
- Next.js 16 App Router, React Query for client data fetching/state
- TailwindCSS styling
- Supabase Postgres + Auth + Storage + pgvector
- OpenAI `text-embedding-3-small` and GPT-4.1/4o/4.1-mini models
- Serverless API routes in `app/api/*` (no separate backend)

## Environment
Copy `.env.example` to `.env.local` for local dev or set in Vercel Project Settings:
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
ADMIN_EMAILS=
```

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
- `POST /api/embed-rules` — admin-authenticated `{ path, title, discipline, documentType, ... }`; writes normalized source metadata and embeddings.
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
- `POST /api/chatbot` — `{ message }` grounded tutor responses with citations.
- `POST /api/rag-search` — `{ query, limit }` direct vector search.
- `POST /api/lessons` — `{ module }` returns lessons + micro-quiz for the module.
- `GET/POST /api/videos` — `GET` lists videos (optionally filtered by difficulty); `POST` creates a new video entry.

## Uploading Rule PDFs and Videos
1. Upload rulebook PDF with an admin bearer token:
   ```
   curl -X POST -H "Authorization: Bearer <admin-token>" -F "file=@/path/to/rulebook.pdf" https://your-vercel-app.vercel.app/api/upload-rules
   ```
   Note the `path` in the response.
2. Embed the rules with required source metadata:
   ```
   curl -X POST -H "Content-Type: application/json" \
     -H "Authorization: Bearer <admin-token>" \
     -d '{"path":"rules/<returned-path>","title":"Official Beach Volleyball Rules","discipline":"beach","documentType":"official_rulebook","effectiveYear":"2025"}' \
     https://your-vercel-app.vercel.app/api/embed-rules
   ```
3. Upload practice clips:
   - **Option A: Via API (Recommended)**
     ```bash
     curl -X POST https://your-vercel-app.vercel.app/api/videos \
       -H "Content-Type: application/json" \
       -d '{
         "difficulty": "easy",
         "video_url": "https://your-storage.com/clip.mp4",
         "correct_call": "Out",
         "explanation": "Ball clearly lands outside sideline",
         "rule_reference": "Rule 8.4"
       }'
     ```
   - **Option B: Via Supabase SQL**
     ```sql
     insert into videos (difficulty, video_url, correct_call, explanation, rule_reference)
     values ('easy', 'https://.../clip.mp4', 'Out', 'Ball clearly lands outside sideline', 'Rule 8.4');
     ```
   
   **Note:** Upload MP4 files to your storage bucket (e.g., `practice-clips` in Supabase Storage) first, then use the public URL in the `video_url` field.

## Managing Migrations
- Use Supabase migration tooling and apply `supabase/migrations/20260712000000_structured_quiz_programs.sql` before using the new quiz flow.
- The migration adds normalized sources, secure generated questions, quiz programs, assignments, frozen sessions, server-graded answers, structured history, flags, quotas, indexes, and RLS policies.
- Existing `rules_embeddings` rows are preserved for compatibility, but cannot be safely classified as Indoor or Beach. Re-upload and embed official PDFs with metadata. Scored generation returns `INSUFFICIENT_SOURCE_CONTEXT` instead of falling back to unrelated text.
- The filtered `match_rule_chunks` RPC powers scored quiz generation. Legacy `match_rules` remains for existing tutor and module features.
- Apply `supabase/migrations/20260713000000_rule_chunk_rulesets.sql` after the structured quiz migration. It separates standard Indoor chunks from Rallyball, Tripleball, and other variations contained in combined rulebooks.

## Notes
- All API routes use Node runtime for OpenAI + PDF parsing.
- Floating AI Tutor (`components/floating-chat.tsx`) is available across pages.
- Adaptive hints on the quiz page recommend modules based on missed questions.

## Quick Verification
- `npm run lint` checks code quality with ESLint (Next.js 16 no longer provides `next lint`).
- `npm test` runs mocked unit and integration tests without live OpenAI calls.
- `npm run build` performs the production Next.js build.
