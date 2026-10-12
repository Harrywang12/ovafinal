begin;

-- ---------------------------------------------------------------------------
-- 1. Lock down direct client table access.
--
-- The browser never queries public tables: every read and write goes through
-- Next.js route handlers that authenticate the caller and use the service
-- role. Earlier migrations left policies that let any signed-in user read
-- answer keys (generated_quiz_questions, quiz_session_questions,
-- video_questions) and write their own scores, passes and attempts directly
-- through PostgREST. Drop those policies and revoke table privileges from the
-- client roles so RLS is no longer the only line of defence.
-- ---------------------------------------------------------------------------

drop policy if exists "auth read video_questions" on public.video_questions;
drop policy if exists "user manage video_question_attempts" on public.video_question_attempts;
drop policy if exists "auth read mcq_challenge_entries" on public.mcq_challenge_entries;
drop policy if exists "user manage mcq_challenge_entries" on public.mcq_challenge_entries;
drop policy if exists "user manage own lesson progress" on public.module_lesson_progress;
drop policy if exists "user manage own module quiz attempts" on public.module_quiz_attempts;
drop policy if exists "user insert own module passes" on public.module_passes;
drop policy if exists "user update own module passes" on public.module_passes;
drop policy if exists "user insert own adaptive quiz state" on public.quiz_adaptive_state;
drop policy if exists "user update own adaptive quiz state" on public.quiz_adaptive_state;
drop policy if exists "user manage quiz_attempts" on public.quiz_attempts;
drop policy if exists "user manage own quiz question history" on public.quiz_question_history;
drop policy if exists "user read own generated questions" on public.generated_quiz_questions;
drop policy if exists "user read own session questions" on public.quiz_session_questions;
drop policy if exists "user create own flags" on public.quiz_question_flags;
drop policy if exists "authenticated read rule documents" on public.rule_documents;
drop policy if exists "authenticated read rule chunks" on public.rule_chunks;

-- quiz_attempts was created by supabase.sql without RLS in some environments.
alter table if exists public.quiz_attempts enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Video clip category (indoor/beach). The practice, challenge and admin
--    routes read and write this column, but no migration created it.
-- ---------------------------------------------------------------------------

alter table public.video_questions
  add column if not exists category text not null default 'indoor'
  check (category in ('indoor', 'beach'));
create index if not exists video_questions_kind_category_idx
  on public.video_questions (kind, category, difficulty);

-- ---------------------------------------------------------------------------
-- 3. Server-timed weekly challenge.
--
-- The answer window starts when the server reveals the options, so the
-- leaderboard time bonus and timeout no longer trust client-reported values.
-- ---------------------------------------------------------------------------

create table if not exists public.video_challenge_starts (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.video_questions(id) on delete cascade,
  started_at timestamptz not null default now(),
  primary key (user_id, question_id)
);
alter table public.video_challenge_starts enable row level security;
revoke all on public.video_challenge_starts from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. One active assigned-quiz session per learner and program.
--
-- Generation that outlived its function timeout left sessions in
-- 'generating' forever. Fail those, then collapse any duplicate active
-- sessions so the unique index can be created.
-- ---------------------------------------------------------------------------

update public.quiz_sessions
  set status = 'generation_failed'
  where status = 'generating' and created_at < now() - interval '10 minutes';

update public.quiz_sessions s
  set status = 'generation_failed'
  where s.status in ('generating', 'ready', 'in_progress')
    and exists (
      select 1 from public.quiz_sessions newer
      where newer.user_id = s.user_id
        and newer.quiz_program_id = s.quiz_program_id
        and newer.status in ('generating', 'ready', 'in_progress')
        and (newer.created_at, newer.id) > (s.created_at, s.id)
    );

create unique index if not exists quiz_sessions_one_active_per_program
  on public.quiz_sessions (user_id, quiz_program_id)
  where status in ('generating', 'ready', 'in_progress');

-- ---------------------------------------------------------------------------
-- 5. Refund AI question quota when an assigned quiz fails to generate, and
--    keep the quota ledger bounded (only the last 24 hours are ever read).
-- ---------------------------------------------------------------------------

create or replace function public.release_ai_quota(
  quota_user_id uuid,
  quota_feature text,
  quota_units integer
) returns void language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('ai-question:' || quota_user_id::text, 0));
  delete from public.quiz_generation_events
    where id = (
      select id from public.quiz_generation_events
      where user_id = quota_user_id
        and feature = quota_feature
        and units = quota_units
        and created_at >= now() - interval '1 hour'
      order by created_at desc
      limit 1
    );
  if random() < 0.05 then
    delete from public.quiz_generation_events where created_at < now() - interval '7 days';
  end if;
end;
$$;

revoke all on function public.release_ai_quota(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.release_ai_quota(uuid, text, integer) to service_role;

-- ---------------------------------------------------------------------------
-- 6. Storage: accept the formats and size the upload route accepts, and
--    create the private rulebook bucket the ingestion routes expect.
-- ---------------------------------------------------------------------------

update storage.buckets
  set allowed_mime_types = array['video/mp4', 'video/webm', 'video/quicktime'],
      file_size_limit = 52428800
  where id = 'practice-clips';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('rules', 'rules', false, 26214400, array['application/pdf'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 7. Remove legacy vector retrieval. Runtime retrieval uses
--    search_rule_chunks_fts only; nothing reads embeddings.
-- ---------------------------------------------------------------------------

do $$
declare fn regprocedure;
begin
  for fn in
    select p.oid::regprocedure from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'match_rule_chunks'
  loop
    execute format('drop function if exists %s', fn);
  end loop;
end $$;

drop index if exists public.rule_chunks_embedding_idx;
alter table public.rule_chunks drop column if exists embedding;
do $$
begin
  drop function if exists public.quiz_question_signature(text);
exception
  when dependent_objects_still_exist then
    raise notice 'quiz_question_signature still has dependents; leaving it installed';
end $$;

do $$
begin
  drop extension if exists vector;
exception
  when dependent_objects_still_exist then
    raise notice 'vector extension still has dependents; leaving it installed';
end $$;

commit;
