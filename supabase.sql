-- Enable pgvector extension
create extension if not exists vector;
create extension if not exists pgcrypto;

-- Table to store embedded rule chunks
create table if not exists public.rules_embeddings (
  id uuid primary key default gen_random_uuid(),
  chunk text not null,
  embedding vector(1536) not null
);


-- Quiz attempts (AI-generated quiz)
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  question jsonb not null,
  selected_option text,
  correct boolean,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create or replace function public.quiz_question_signature(input text)
returns text
language sql
immutable
as $$
  select encode(
    digest(
      btrim(regexp_replace(regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', ' ', 'g'), '\s+', ' ', 'g')),
      'sha256'
    ),
    'hex'
  );
$$;

create table if not exists public.quiz_question_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null check (scope in ('adaptive', 'module')),
  module_id text,
  question_level text check (question_level is null or question_level in ('beginner', 'intermediate', 'hard')),
  question_text text not null,
  question_signature text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  check (
    (scope = 'adaptive' and module_id is null)
    or (scope = 'module' and module_id is not null)
  )
);

create index if not exists quiz_question_history_user_scope_created_idx
  on public.quiz_question_history (user_id, scope, module_id, created_at desc);

create index if not exists quiz_question_history_user_signature_idx
  on public.quiz_question_history (user_id, scope, module_id, question_signature);

create unique index if not exists quiz_question_history_user_scope_signature_unique
  on public.quiz_question_history (user_id, scope, coalesce(module_id, ''), question_signature);


-- Learner profiles
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  referee_level text not null default 'level_1'
    check (referee_level in ('level_1', 'level_2', 'level_3', 'level_4')),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

-- Module learning progress
create table if not exists public.module_lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id text not null,
  lesson_id text not null,
  viewed_at timestamp with time zone default timezone('utc'::text, now()),
  unique (user_id, module_id, lesson_id)
);

create table if not exists public.module_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id text not null,
  question_level text not null check (question_level in ('beginner', 'intermediate', 'hard')),
  question jsonb not null,
  selected_option text not null,
  correct boolean not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create index if not exists module_quiz_attempts_user_module_created_idx
  on public.module_quiz_attempts (user_id, module_id, created_at desc);

create table if not exists public.module_passes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id text not null,
  latest_attempts_count integer not null default 10,
  correct_count integer not null,
  score_percent integer not null,
  passed_at timestamp with time zone default timezone('utc'::text, now()),
  unique (user_id, module_id)
);

create table if not exists public.quiz_adaptive_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_difficulty text not null check (current_difficulty in ('easy', 'medium', 'hard')),
  correct_streak integer not null default 0,
  incorrect_streak integer not null default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

drop trigger if exists quiz_adaptive_state_touch_updated_at on public.quiz_adaptive_state;
create trigger quiz_adaptive_state_touch_updated_at
before update on public.quiz_adaptive_state
for each row execute function public.touch_updated_at();

create table if not exists public.module_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id text not null,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamp with time zone default timezone('utc'::text, now()),
  unique (user_id, module_id)
);

create index if not exists module_assignments_user_idx
  on public.module_assignments (user_id);

create table if not exists public.quiz_assignments (
  user_id uuid primary key references auth.users(id) on delete cascade,
  question_quota integer not null check (question_quota > 0),
  required_percent integer not null check (required_percent between 1 and 100),
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamp with time zone default timezone('utc'::text, now()),
  completed_at timestamp with time zone
);

-- Lessons content
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  module text not null
);

-- Indexes for vector search
create index if not exists rules_embeddings_embedding_idx
  on public.rules_embeddings
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

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
-- Admin helper
-- ---------------------------------------------------------------------------

create table if not exists public.admin_users (
  email text primary key check (email = lower(trim(email))),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

insert into public.admin_users (email)
values ('yixuanwang2009@gmail.com')
on conflict (email) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ---------------------------------------------------------------------------
-- MCQ Video Challenges (Admin-authored)
-- ---------------------------------------------------------------------------

create table if not exists public.video_questions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('practice','challenge')),
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  video_url text not null,
  pause_at_seconds integer not null check (pause_at_seconds > 0),
  options jsonb not null,
  correct_option_index integer not null check (correct_option_index between 0 and 3),
  explanation text,
  rule_reference text,
  is_weekly boolean not null default false,
  answer_window_seconds integer check (answer_window_seconds is null or answer_window_seconds > 0),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.video_question_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  question_id uuid references public.video_questions(id) on delete cascade,
  selected_option_index integer,
  correct boolean,
  timed_out boolean not null default false,
  time_taken_ms integer,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.mcq_challenge_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  question_id uuid references public.video_questions(id) on delete cascade,
  score numeric,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create view public.weekly_leaderboard_mcq as
select user_id, max(score) as best_score
from public.mcq_challenge_entries
where created_at >= date_trunc('week', now())
group by user_id
order by best_score desc;

alter view public.weekly_leaderboard_mcq set (security_invoker = true);

-- ---------------------------------------------------------------------------
-- Row Level Security (RLS) and Policies
-- ---------------------------------------------------------------------------

alter table if exists public.rules_embeddings enable row level security;
create policy "auth read rules_embeddings"
  on public.rules_embeddings for select
  using (auth.role() = 'authenticated');

alter table if exists public.lessons enable row level security;
create policy "auth read lessons"
  on public.lessons for select
  using (auth.role() = 'authenticated');

alter table if exists public.quiz_attempts enable row level security;
create policy "user manage quiz_attempts"
  on public.quiz_attempts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table if exists public.quiz_question_history enable row level security;
create policy "user manage own quiz question history"
  on public.quiz_question_history for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id);

alter table if exists public.profiles enable row level security;
create policy "user read own profile"
  on public.profiles for select
  using (auth.uid() = user_id or public.is_admin());

alter table if exists public.admin_users enable row level security;
create policy "admin read admin_users"
  on public.admin_users for select
  using (public.is_admin());
create policy "admin manage admin_users"
  on public.admin_users for all
  using (public.is_admin())
  with check (public.is_admin());

alter table if exists public.module_lesson_progress enable row level security;
create policy "user manage own lesson progress"
  on public.module_lesson_progress for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id);

alter table if exists public.module_quiz_attempts enable row level security;
create policy "user manage own module quiz attempts"
  on public.module_quiz_attempts for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id);

alter table if exists public.module_passes enable row level security;
create policy "user read own module passes"
  on public.module_passes for select
  using (auth.uid() = user_id or public.is_admin());
create policy "user insert own module passes"
  on public.module_passes for insert
  with check (auth.uid() = user_id);
create policy "user update own module passes"
  on public.module_passes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table if exists public.quiz_adaptive_state enable row level security;
create policy "user read own adaptive quiz state"
  on public.quiz_adaptive_state for select
  using (auth.uid() = user_id or public.is_admin());
create policy "user insert own adaptive quiz state"
  on public.quiz_adaptive_state for insert
  with check (auth.uid() = user_id);
create policy "user update own adaptive quiz state"
  on public.quiz_adaptive_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table if exists public.module_assignments enable row level security;
create policy "user read own module assignments"
  on public.module_assignments for select
  using (auth.uid() = user_id or public.is_admin());
create policy "admin manage module assignments"
  on public.module_assignments for all
  using (public.is_admin())
  with check (public.is_admin());

alter table if exists public.quiz_assignments enable row level security;
create policy "user read own quiz assignment"
  on public.quiz_assignments for select
  using (auth.uid() = user_id or public.is_admin());
create policy "admin manage quiz assignments"
  on public.quiz_assignments for all
  using (public.is_admin())
  with check (public.is_admin());

alter table if exists public.video_questions enable row level security;
create policy "auth read video_questions"
  on public.video_questions for select
  using (auth.role() = 'authenticated');
create policy "admin manage video_questions"
  on public.video_questions for all
  using (public.is_admin())
  with check (public.is_admin());

alter table if exists public.video_question_attempts enable row level security;
create policy "user manage video_question_attempts"
  on public.video_question_attempts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table if exists public.mcq_challenge_entries enable row level security;
create policy "auth read mcq_challenge_entries"
  on public.mcq_challenge_entries for select
  using (auth.role() = 'authenticated');
create policy "user manage mcq_challenge_entries"
  on public.mcq_challenge_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
