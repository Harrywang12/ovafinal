-- Migration: durable quiz question history for duplicate prevention
-- Date: 2026-07-09

begin;

create extension if not exists pgcrypto;

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

insert into public.quiz_question_history (
  user_id,
  scope,
  module_id,
  question_level,
  question_text,
  question_signature,
  created_at
)
select
  qa.user_id,
  'adaptive',
  null,
  case
    when qa.question ->> 'question_level' in ('beginner', 'intermediate', 'hard')
      then qa.question ->> 'question_level'
    else null
  end,
  qa.question ->> 'question',
  public.quiz_question_signature(qa.question ->> 'question'),
  qa.created_at
from public.quiz_attempts qa
where qa.user_id is not null
  and qa.question ? 'question'
  and nullif(btrim(qa.question ->> 'question'), '') is not null
  and not exists (
    select 1
    from public.quiz_question_history h
    where h.user_id = qa.user_id
      and h.scope = 'adaptive'
      and h.module_id is null
      and h.question_signature = public.quiz_question_signature(qa.question ->> 'question')
      and h.created_at = qa.created_at
  )
on conflict do nothing;

insert into public.quiz_question_history (
  user_id,
  scope,
  module_id,
  question_level,
  question_text,
  question_signature,
  created_at
)
select
  mqa.user_id,
  'module',
  mqa.module_id,
  mqa.question_level,
  mqa.question ->> 'question',
  public.quiz_question_signature(mqa.question ->> 'question'),
  mqa.created_at
from public.module_quiz_attempts mqa
where mqa.user_id is not null
  and mqa.question ? 'question'
  and nullif(btrim(mqa.question ->> 'question'), '') is not null
  and not exists (
    select 1
    from public.quiz_question_history h
    where h.user_id = mqa.user_id
      and h.scope = 'module'
      and h.module_id = mqa.module_id
      and h.question_signature = public.quiz_question_signature(mqa.question ->> 'question')
      and h.created_at = mqa.created_at
  )
on conflict do nothing;

alter table if exists public.quiz_question_history enable row level security;

do $$
begin
  create policy "user manage own quiz question history"
    on public.quiz_question_history for all
    using (auth.uid() = user_id or public.is_admin())
    with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

commit;
