-- Migration: referee levels 1-4, adaptive quiz state, and module assignments
-- Date: 2026-06-23

begin;

alter table public.profiles
  drop constraint if exists profiles_referee_level_check;

update public.profiles
set referee_level = 'level_2'
where referee_level = 'level_2_plus';

alter table public.profiles
  alter column referee_level set default 'level_1';

alter table public.profiles
  add constraint profiles_referee_level_check
  check (referee_level in ('level_1', 'level_2', 'level_3', 'level_4'));

alter table public.module_quiz_attempts
  drop constraint if exists module_quiz_attempts_question_level_check;

alter table public.module_quiz_attempts
  add constraint module_quiz_attempts_question_level_check
  check (question_level in ('beginner', 'intermediate', 'hard'));

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

alter table if exists public.quiz_adaptive_state enable row level security;
alter table if exists public.module_assignments enable row level security;

do $$
begin
  create policy "user read own adaptive quiz state"
    on public.quiz_adaptive_state for select
    using (auth.uid() = user_id or public.is_admin());
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "user insert own adaptive quiz state"
    on public.quiz_adaptive_state for insert
    with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "user update own adaptive quiz state"
    on public.quiz_adaptive_state for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "user read own module assignments"
    on public.module_assignments for select
    using (auth.uid() = user_id or public.is_admin());
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "admin manage module assignments"
    on public.module_assignments for all
    using (public.is_admin())
    with check (public.is_admin());
exception
  when duplicate_object then null;
end $$;

commit;
