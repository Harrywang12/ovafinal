-- Migration: prevent repeat attempts for video questions
-- Date: 2026-02-03

begin;

-- Dedupe video_question_attempts before enforcing uniqueness
delete from public.video_question_attempts a
using public.video_question_attempts b
where a.user_id = b.user_id
  and a.question_id = b.question_id
  and a.user_id is not null
  and a.ctid <> b.ctid
  and a.created_at > b.created_at;

delete from public.video_question_attempts a
using public.video_question_attempts b
where a.user_id = b.user_id
  and a.question_id = b.question_id
  and a.user_id is not null
  and a.created_at = b.created_at
  and a.ctid > b.ctid;

-- Dedupe mcq_challenge_entries before enforcing uniqueness
delete from public.mcq_challenge_entries a
using public.mcq_challenge_entries b
where a.user_id = b.user_id
  and a.question_id = b.question_id
  and a.user_id is not null
  and a.ctid <> b.ctid
  and a.created_at > b.created_at;

delete from public.mcq_challenge_entries a
using public.mcq_challenge_entries b
where a.user_id = b.user_id
  and a.question_id = b.question_id
  and a.user_id is not null
  and a.created_at = b.created_at
  and a.ctid > b.ctid;

-- Ensure a user can attempt a video question only once
create unique index if not exists video_question_attempts_user_question_unique
  on public.video_question_attempts (user_id, question_id)
  where user_id is not null;

-- Ensure a user can only submit one challenge entry per question
create unique index if not exists mcq_challenge_entries_user_question_unique
  on public.mcq_challenge_entries (user_id, question_id)
  where user_id is not null;

commit;
