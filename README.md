# Volleyball Referee Training (Serverless, Vercel)

RAG-powered volleyball officiating trainer built with Next.js 14 (App Router), TailwindCSS, Supabase (Postgres, Auth, Storage, pgvector), and OpenAI. All backend logic lives in Vercel serverless API routes.

## Stack
- Next.js 14 App Router, React Query for client data fetching/state
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
```

## Database / Storage Setup
1. In Supabase SQL editor, run `supabase.sql` (enables `pgvector`, creates tables, RPC function, leaderboard view).
2. Create Storage buckets:
   - `rules` (for rulebook PDFs)
   - `practice-clips` (for MP4 practice clips)
3. Optional policies: allow authenticated inserts/selects on tables used from client (e.g., `quiz_attempts`, `video_attempts`). Server routes use the service key for admin writes.

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
- `POST /api/upload-rules` — form-data with `file` (PDF). Stored in `rules` bucket.
- `POST /api/embed-rules` — `{ path }` where path is returned from upload. Parses PDF, chunks, embeds, inserts into `rules_embeddings`.
- `POST /api/generate-question` — `{ difficulty }` (easy/medium/hard). RAG + LLM → MCQ with citation.
- `POST /api/quiz-attempt` — `{ question, selected_option, correct, user_id? }` logs attempts.
- `GET/POST /api/practice` — `GET ?difficulty=` returns random clip metadata; `POST` logs attempt.
- `GET/POST /api/challenge` — fetch weekly extreme clip + leaderboard or submit weekly score.
- `POST /api/chatbot` — `{ message }` grounded tutor responses with citations.
- `POST /api/rag-search` — `{ query, limit }` direct vector search.
- `POST /api/lessons` — `{ module }` returns lessons + micro-quiz for the module.
- `GET/POST /api/videos` — `GET` lists videos (optionally filtered by difficulty); `POST` creates a new video entry.

## Uploading Rule PDFs and Videos
1. Upload rulebook PDF via `curl`:
   ```
   curl -X POST -F "file=@/path/to/rulebook.pdf" https://your-vercel-app.vercel.app/api/upload-rules
   ```
   Note the `path` in the response.
2. Embed the rules:
   ```
   curl -X POST -H "Content-Type: application/json" \
     -d '{"path":"rules/<returned-path>"}' \
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
- Use Supabase migration tooling or run `supabase.sql` directly.
- The `match_rules` RPC handles pgvector similarity for RAG search.

## Notes
- All API routes use Node runtime for OpenAI + PDF parsing.
- Floating AI Tutor (`components/floating-chat.tsx`) is available across pages.
- Adaptive hints on the quiz page recommend modules based on missed questions.

## Quick Verification
- `pnpm lint` (or `npm run lint`) checks code quality.
- Trigger `/api/generate-question` locally after embedding the rulebook to validate RAG + LLM pipeline.
