-- Enable pgvector extension
create extension if not exists vector;

-- Table to store embedded rule chunks
create table if not exists public.rules_embeddings (
  id uuid primary key default gen_random_uuid(),
  chunk text not null,
  embedding vector(1536) not null
);

-- Quiz attempts
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  question jsonb not null,
  selected_option text,
  correct boolean,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Videos metadata
create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  difficulty text not null check (difficulty in ('easy','medium','hard','extreme')),
  video_url text not null,
  correct_call text not null,
  explanation text,
  rule_reference text
);

-- Attempts on practice videos
create table if not exists public.video_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  video_id uuid references public.videos(id) on delete cascade,
  correct boolean,
  time_taken integer,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Lessons content
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  module text not null
);

-- User progress / adaptive learning
create table if not exists public.user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  quiz_score numeric,
  missed_topics text[]
);

-- Indexes for vector search
create index if not exists rules_embeddings_embedding_idx
  on public.rules_embeddings
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Leaderboard view for weekly challenge
create table if not exists public.challenge_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  video_id uuid references public.videos(id) on delete cascade,
  score numeric,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create view public.weekly_leaderboard as
select user_id, max(score) as best_score
from public.challenge_entries
where created_at >= date_trunc('week', now())
group by user_id
order by best_score desc;

-- Ensure view runs with caller's privileges (avoid SECURITY DEFINER)
alter view public.weekly_leaderboard set (security_invoker = true);

-- RPC for vector search over rules
create or replace function public.match_rules(
  query_embedding vector(1536),
  match_count int default 5
) returns table (
  chunk text,
  similarity double precision
) language plpgsql as $$
begin
  return query
  select r.chunk, 1 - (r.embedding <=> query_embedding) as similarity
  from public.rules_embeddings r
  order by r.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security (RLS) and Policies
-- ---------------------------------------------------------------------------

alter table if exists public.rules_embeddings enable row level security;
create policy "auth read rules_embeddings"
  on public.rules_embeddings for select
  using (auth.role() = 'authenticated');

alter table if exists public.videos enable row level security;
create policy "auth read videos"
  on public.videos for select
  using (auth.role() = 'authenticated');

alter table if exists public.video_attempts enable row level security;
create policy "user manage video_attempts"
  on public.video_attempts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table if exists public.lessons enable row level security;
create policy "auth read lessons"
  on public.lessons for select
  using (auth.role() = 'authenticated');

alter table if exists public.quiz_attempts enable row level security;
create policy "user manage quiz_attempts"
  on public.quiz_attempts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table if exists public.user_progress enable row level security;
create policy "user manage user_progress"
  on public.user_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table if exists public.challenge_entries enable row level security;
create policy "auth read challenge_entries"
  on public.challenge_entries for select
  using (auth.role() = 'authenticated');
create policy "user manage challenge_entries"
  on public.challenge_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
