create table if not exists public.admin_users (
  email text primary key check (email = lower(trim(email))),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

-- Preserve access for the original administrator while moving authorization
-- out of application source code. Additional administrators are managed in-app.
insert into public.admin_users (email)
values ('yixuanwang2009@gmail.com')
on conflict (email) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

alter table public.admin_users enable row level security;

drop policy if exists "admin read admin_users" on public.admin_users;
create policy "admin read admin_users"
  on public.admin_users for select
  using (public.is_admin());

drop policy if exists "admin manage admin_users" on public.admin_users;
create policy "admin manage admin_users"
  on public.admin_users for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "practice-clips admin upload" on storage.objects;
create policy "practice-clips admin upload"
  on storage.objects for insert
  with check (
    bucket_id = 'practice-clips'
    and public.is_admin()
  );
