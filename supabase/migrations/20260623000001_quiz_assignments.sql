-- Migration: standalone adaptive quiz quota assignments
-- Date: 2026-06-23

begin;

create table if not exists public.quiz_assignments (
  user_id uuid primary key references auth.users(id) on delete cascade,
  question_quota integer not null check (question_quota > 0),
  required_percent integer not null check (required_percent between 1 and 100),
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamp with time zone default timezone('utc'::text, now()),
  completed_at timestamp with time zone
);

alter table if exists public.quiz_assignments enable row level security;

do $$
begin
  create policy "user read own quiz assignment"
    on public.quiz_assignments for select
    using (auth.uid() = user_id or public.is_admin());
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "admin manage quiz assignments"
    on public.quiz_assignments for all
    using (public.is_admin())
    with check (public.is_admin());
exception
  when duplicate_object then null;
end $$;

commit;
