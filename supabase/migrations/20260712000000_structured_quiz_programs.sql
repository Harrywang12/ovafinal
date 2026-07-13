begin;

create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists public.rule_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  discipline text not null check (discipline in ('indoor', 'beach')),
  document_type text not null,
  effective_year text,
  source_url text,
  storage_path text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.rule_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.rule_documents(id) on delete cascade,
  chunk_text text not null,
  embedding vector(1536) not null, 
  page_number integer,
  rule_number text,
  section_title text,
  case_number text,
  topic text,
  minimum_referee_level text check (minimum_referee_level is null or minimum_referee_level in ('level_1', 'level_2', 'level_3', 'level_4')),
  maximum_referee_level text check (maximum_referee_level is null or maximum_referee_level in ('level_1', 'level_2', 'level_3', 'level_4')),
  created_at timestamptz not null default now()
);

create index if not exists rule_chunks_document_id_idx on public.rule_chunks (document_id);
create index if not exists rule_chunks_topic_idx on public.rule_chunks (topic);
create index if not exists rule_chunks_embedding_idx on public.rule_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create or replace function public.match_rule_chunks(
  query_embedding vector(1536),
  match_count integer default 5,
  filter_discipline text default null,
  filter_referee_level text default null,
  filter_document_types text[] default null,
  filter_topic text default null
) returns table (
  id uuid,
  document_id uuid,
  document_title text,
  document_type text,
  discipline text,
  chunk_text text,
  page_number integer,
  rule_number text,
  section_title text,
  case_number text,
  topic text,
  source_url text,
  storage_path text,
  similarity double precision
) language sql stable as $$
  select c.id, c.document_id, d.title, d.document_type, d.discipline, c.chunk_text,
    c.page_number, c.rule_number, c.section_title, c.case_number, c.topic,
    d.source_url, d.storage_path, 1 - (c.embedding <=> query_embedding)
  from public.rule_chunks c
  join public.rule_documents d on d.id = c.document_id
  where (filter_discipline is null or d.discipline = filter_discipline)
    and (filter_document_types is null or d.document_type = any(filter_document_types))
    and (filter_topic is null or c.topic is null or c.topic = filter_topic)
    and (
      filter_referee_level is null
      or (coalesce(nullif(substring(c.minimum_referee_level from '[0-9]+'), ''), '1')::integer <= substring(filter_referee_level from '[0-9]+')::integer
        and coalesce(nullif(substring(c.maximum_referee_level from '[0-9]+'), ''), '4')::integer >= substring(filter_referee_level from '[0-9]+')::integer)
    )
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

alter table public.quiz_question_history
  add column if not exists discipline text check (discipline is null or discipline in ('indoor', 'beach')),
  add column if not exists referee_level text check (referee_level is null or referee_level in ('level_1', 'level_2', 'level_3', 'level_4')),
  add column if not exists topic text,
  add column if not exists subtopic text,
  add column if not exists rule_id text,
  add column if not exists rule_reference text,
  add column if not exists scenario_type text,
  add column if not exists referee_role text,
  add column if not exists decision_type text,
  add column if not exists quiz_session_id uuid;

alter table public.quiz_question_history drop constraint if exists quiz_question_history_scope_check;
alter table public.quiz_question_history add constraint quiz_question_history_scope_check
  check (scope in ('adaptive', 'module', 'program'));
alter table public.quiz_question_history drop constraint if exists quiz_question_history_check;
alter table public.quiz_question_history add constraint quiz_question_history_module_scope_check check (
  (scope in ('adaptive', 'program') and module_id is null)
  or (scope = 'module' and module_id is not null)
);

create index if not exists quiz_question_history_structured_recent_idx
  on public.quiz_question_history (user_id, discipline, referee_level, created_at desc);

create table if not exists public.generated_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_data jsonb not null,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists generated_quiz_questions_user_created_idx on public.generated_quiz_questions (user_id, created_at desc);

create table if not exists public.quiz_programs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  discipline text not null check (discipline in ('indoor', 'beach')),
  referee_level text not null check (referee_level in ('level_1', 'level_2', 'level_3', 'level_4')),
  required_quiz_count integer not null default 1 check (required_quiz_count > 0),
  questions_per_quiz integer not null default 10 check (questions_per_quiz between 1 and 30),
  minimum_score_percent integer not null default 70 check (minimum_score_percent between 0 and 100),
  start_at timestamptz,
  due_at timestamptz,
  difficulty_progression jsonb not null,
  topic_blueprint jsonb not null,
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (due_at is null or start_at is null or due_at > start_at)
);

create table if not exists public.quiz_program_assignments (
  id uuid primary key default gen_random_uuid(),
  quiz_program_id uuid not null references public.quiz_programs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (quiz_program_id, user_id)
);
create index if not exists quiz_program_assignments_user_idx on public.quiz_program_assignments (user_id);
create index if not exists quiz_program_assignments_program_idx on public.quiz_program_assignments (quiz_program_id);

create table if not exists public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  quiz_program_id uuid references public.quiz_programs(id) on delete restrict,
  quiz_program_assignment_id uuid references public.quiz_program_assignments(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  discipline text not null check (discipline in ('indoor', 'beach')),
  referee_level text not null check (referee_level in ('level_1', 'level_2', 'level_3', 'level_4')),
  quiz_number integer not null check (quiz_number > 0),
  status text not null default 'generating' check (status in ('generating', 'ready', 'in_progress', 'submitted', 'generation_failed')),
  started_at timestamptz,
  submitted_at timestamptz,
  score_percent numeric,
  passed boolean,
  created_at timestamptz not null default now()
);
create index if not exists quiz_sessions_user_program_idx on public.quiz_sessions (user_id, quiz_program_id, created_at desc);
create index if not exists quiz_sessions_assignment_idx on public.quiz_sessions (quiz_program_assignment_id);

create table if not exists public.quiz_session_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_session_id uuid not null references public.quiz_sessions(id) on delete cascade,
  sequence_number integer not null check (sequence_number > 0),
  question_data jsonb not null,
  source_chunk_ids uuid[] not null check (cardinality(source_chunk_ids) > 0),
  created_at timestamptz not null default now(),
  unique (quiz_session_id, sequence_number)
);
create index if not exists quiz_session_questions_session_idx on public.quiz_session_questions (quiz_session_id);

create table if not exists public.quiz_session_answers (
  id uuid primary key default gen_random_uuid(),
  quiz_session_question_id uuid not null references public.quiz_session_questions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  selected_answer text not null,
  correct boolean not null,
  answered_at timestamptz not null default now(),
  unique (quiz_session_question_id, user_id)
);
create index if not exists quiz_session_answers_user_idx on public.quiz_session_answers (user_id, answered_at desc);

create table if not exists public.quiz_question_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_session_question_id uuid references public.quiz_session_questions(id) on delete cascade,
  generated_quiz_question_id uuid references public.generated_quiz_questions(id) on delete cascade,
  reason text not null check (reason in ('incorrect_answer', 'ambiguous_wording', 'incorrect_rule_reference', 'outside_referee_level', 'duplicate_question', 'technical_issue', 'other')),
  comment text,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  review_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (quiz_session_question_id is not null or generated_quiz_question_id is not null)
);
create index if not exists quiz_question_flags_status_created_idx on public.quiz_question_flags (status, created_at desc);

create table if not exists public.quiz_generation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  units integer not null default 1 check (units > 0),
  created_at timestamptz not null default now()
);
create index if not exists quiz_generation_events_user_created_idx on public.quiz_generation_events (user_id, created_at desc);

alter table public.rule_documents enable row level security;
alter table public.rule_chunks enable row level security;
alter table public.generated_quiz_questions enable row level security;
alter table public.quiz_programs enable row level security;
alter table public.quiz_program_assignments enable row level security;
alter table public.quiz_sessions enable row level security;
alter table public.quiz_session_questions enable row level security;
alter table public.quiz_session_answers enable row level security;
alter table public.quiz_question_flags enable row level security;
alter table public.quiz_generation_events enable row level security;

create policy "authenticated read rule documents" on public.rule_documents for select using (auth.role() = 'authenticated');
create policy "admin manage rule documents" on public.rule_documents for all using (public.is_admin()) with check (public.is_admin());
create policy "authenticated read rule chunks" on public.rule_chunks for select using (auth.role() = 'authenticated');
create policy "admin manage rule chunks" on public.rule_chunks for all using (public.is_admin()) with check (public.is_admin());
create policy "user read own generated questions" on public.generated_quiz_questions for select using (auth.uid() = user_id or public.is_admin());
create policy "authenticated read active quiz programs" on public.quiz_programs for select using (auth.role() = 'authenticated' and (archived_at is null or public.is_admin()));
create policy "admin manage quiz programs" on public.quiz_programs for all using (public.is_admin()) with check (public.is_admin());
create policy "user read own program assignments" on public.quiz_program_assignments for select using (auth.uid() = user_id or public.is_admin());
create policy "admin manage program assignments" on public.quiz_program_assignments for all using (public.is_admin()) with check (public.is_admin());
create policy "user read own quiz sessions" on public.quiz_sessions for select using (auth.uid() = user_id or public.is_admin());
create policy "user read own session questions" on public.quiz_session_questions for select using (exists (select 1 from public.quiz_sessions s where s.id = quiz_session_id and (s.user_id = auth.uid() or public.is_admin())));
create policy "user read own session answers" on public.quiz_session_answers for select using (auth.uid() = user_id or public.is_admin());
create policy "user create own flags" on public.quiz_question_flags for insert with check (auth.uid() = user_id);
create policy "user read own flags" on public.quiz_question_flags for select using (auth.uid() = user_id or public.is_admin());
create policy "admin manage flags" on public.quiz_question_flags for all using (public.is_admin()) with check (public.is_admin());

commit;
