begin;

alter table public.quiz_sessions drop constraint if exists quiz_sessions_status_check;
alter table public.quiz_sessions add constraint quiz_sessions_status_check
  check (status in ('generating', 'ready', 'in_progress', 'submitting', 'submitted', 'generation_failed'));

delete from public.quiz_session_answers a
using public.quiz_session_answers b
where a.id > b.id
  and a.quiz_session_question_id = b.quiz_session_question_id
  and a.user_id = b.user_id;

create unique index if not exists quiz_session_answers_user_question_unique
  on public.quiz_session_answers (user_id, quiz_session_question_id);

drop policy if exists "user update own profile" on public.profiles;
drop policy if exists "user insert own profile" on public.profiles;

commit;
