-- Migration: learning progress, referee profiles, and module pass tracking
-- Date: 2026-06-22

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

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

insert into public.profiles (user_id, email, referee_level)
select
  u.id,
  u.email,
  case
    when u.raw_user_meta_data ->> 'referee_level' in ('level_2', 'level_3', 'level_4') then u.raw_user_meta_data ->> 'referee_level'
    when u.raw_user_meta_data ->> 'referee_level' = 'level_2_plus' then 'level_2'
    else 'level_1'
  end
from auth.users u
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Module learning progress
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- RLS + Policies
-- ---------------------------------------------------------------------------

alter table if exists public.profiles enable row level security;
alter table if exists public.module_lesson_progress enable row level security;
alter table if exists public.module_quiz_attempts enable row level security;
alter table if exists public.module_passes enable row level security;

do $$
begin
  create policy "user read own profile"
    on public.profiles for select
    using (auth.uid() = user_id or public.is_admin());
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "user update own profile"
    on public.profiles for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "user insert own profile"
    on public.profiles for insert
    with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "user manage own lesson progress"
    on public.module_lesson_progress for all
    using (auth.uid() = user_id or public.is_admin())
    with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "user manage own module quiz attempts"
    on public.module_quiz_attempts for all
    using (auth.uid() = user_id or public.is_admin())
    with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "user read own module passes"
    on public.module_passes for select
    using (auth.uid() = user_id or public.is_admin());
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "user insert own module passes"
    on public.module_passes for insert
    with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "user update own module passes"
    on public.module_passes for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

commit;
