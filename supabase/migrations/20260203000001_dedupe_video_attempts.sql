-- Migration: dedupe video_question_attempts before unique index
-- Date: 2026-02-03

begin;

-- Keep the earliest attempt per (user_id, question_id)
delete from public.video_question_attempts a
using public.video_question_attempts b
where a.user_id = b.user_id
  and a.question_id = b.question_id
  and a.user_id is not null
  and a.ctid <> b.ctid
  and a.created_at > b.created_at;

-- If timestamps are identical, keep the lowest ctid
delete from public.video_question_attempts a
using public.video_question_attempts b
where a.user_id = b.user_id
  and a.question_id = b.question_id
  and a.user_id is not null
  and a.created_at = b.created_at
  and a.ctid > b.ctid;

commit;
