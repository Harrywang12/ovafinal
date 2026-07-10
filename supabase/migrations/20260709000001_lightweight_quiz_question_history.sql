-- Migration: remove heavyweight quiz history storage
-- Date: 2026-07-09

begin;

drop function if exists public.match_quiz_question_history(vector(1536), uuid, text, text, int);
drop index if exists public.quiz_question_history_embedding_idx;

alter table if exists public.quiz_question_history
  drop column if exists embedding,
  drop column if exists question;

create unique index if not exists quiz_question_history_user_scope_signature_unique
  on public.quiz_question_history (user_id, scope, coalesce(module_id, ''), question_signature);

commit;
