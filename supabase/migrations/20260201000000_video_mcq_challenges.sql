-- Migration: MCQ video challenges + admin policies
-- Date: 2026-02-01
--
-- Adds admin-authored video questions with:
-- - pause_at_seconds
-- - 4 answer options
-- - correct option index
-- - difficulty-based answer window (enforced in app)
--
-- Also adds attempt tracking and a weekly leaderboard view.

begin;

-- gen_random_uuid() is used throughout the schema
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Storage Bucket for Practice Clips
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
values (
  'practice-clips',
  'practice-clips',
  true,
  false,
  52428800,
  array['video/mp4', 'video/quicktime', 'video/x-msvideo']
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Admin helper
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'email'), '') = 'yixuanwang2009@gmail.com';
$$;

-- ---------------------------------------------------------------------------
-- MCQ Video Questions (Admin-authored)
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

-- Weekly leaderboard for MCQ challenge entries
create or replace view public.weekly_leaderboard_mcq as
select user_id, max(score) as best_score
from public.mcq_challenge_entries
where created_at >= date_trunc('week', now())
group by user_id
order by best_score desc;

alter view public.weekly_leaderboard_mcq set (security_invoker = true);

-- ---------------------------------------------------------------------------
-- RLS + Policies
-- ---------------------------------------------------------------------------

-- Storage bucket policies (storage.objects already has RLS enabled)
do $$
begin
  create policy "practice-clips public read"
    on storage.objects for select
    using (bucket_id = 'practice-clips');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "practice-clips admin upload"
    on storage.objects for insert
    with check (
      bucket_id = 'practice-clips'
      and (auth.jwt() ->> 'email') = 'yixuanwang2009@gmail.com'
    );
exception
  when duplicate_object then null;
end $$;

alter table if exists public.video_questions enable row level security;
alter table if exists public.video_question_attempts enable row level security;
alter table if exists public.mcq_challenge_entries enable row level security;

-- video_questions
-- - authenticated can read
-- - admin can manage

do $$
begin
  create policy "auth read video_questions"
    on public.video_questions for select
    using (auth.role() = 'authenticated');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "admin manage video_questions"
    on public.video_questions for all
    using (public.is_admin())
    with check (public.is_admin());
exception
  when duplicate_object then null;
end $$;

-- video_question_attempts
-- - user can manage their own

do $$
begin
  create policy "user manage video_question_attempts"
    on public.video_question_attempts for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

-- mcq_challenge_entries
-- - authenticated can read
-- - user can manage their own

do $$
begin
  create policy "auth read mcq_challenge_entries"
    on public.mcq_challenge_entries for select
    using (auth.role() = 'authenticated');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "user manage mcq_challenge_entries"
    on public.mcq_challenge_entries for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

commit;
