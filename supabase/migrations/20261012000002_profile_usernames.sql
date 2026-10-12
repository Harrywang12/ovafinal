begin;

-- Public display name for the weekly leaderboard. Optional so existing
-- learners keep working until they choose one; unique ignoring case.
alter table public.profiles
  add column if not exists username text
  check (username is null or username ~ '^[A-Za-z0-9_]{3,20}$');

create unique index if not exists profiles_username_unique
  on public.profiles (lower(username))
  where username is not null;

commit;
