begin;

create table if not exists public.rate_limit_buckets (
  subject_hash text not null,
  scope text not null,
  window_start timestamptz not null,
  window_seconds integer not null check (window_seconds > 0),
  units bigint not null default 0 check (units >= 0),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (subject_hash, scope, window_start, window_seconds)
);

create index if not exists rate_limit_buckets_expires_idx
  on public.rate_limit_buckets (expires_at);

alter table public.rate_limit_buckets enable row level security;

create or replace function public.consume_rate_limits(limit_policies jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  policy jsonb;
  subject_value text;
  subject_hash_value text;
  scope_value text;
  units_value bigint;
  limit_value bigint;
  window_seconds_value integer;
  window_epoch bigint;
  window_start_value timestamptz;
  window_end_value timestamptz;
  current_units bigint;
  remaining_units bigint;
  minimum_remaining bigint := null;
  retry_after_seconds integer := 1;
begin
  if jsonb_typeof(limit_policies) <> 'array'
    or jsonb_array_length(limit_policies) < 1
    or jsonb_array_length(limit_policies) > 10 then
    raise exception 'limit_policies must contain between 1 and 10 policies';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(limit_policies) as items(value)
    group by value ->> 'subject', value ->> 'scope', value ->> 'window_seconds'
    having count(*) > 1
  ) then
    raise exception 'duplicate rate-limit policy';
  end if;

  -- Lock every bucket in deterministic order so concurrent requests cannot
  -- overshoot either a user budget or the project-wide budget.
  for policy in
    select value
    from jsonb_array_elements(limit_policies)
    order by value ->> 'scope', value ->> 'subject', value ->> 'window_seconds'
  loop
    subject_value := policy ->> 'subject';
    scope_value := policy ->> 'scope';
    units_value := coalesce((policy ->> 'units')::bigint, 1);
    limit_value := (policy ->> 'limit')::bigint;
    window_seconds_value := (policy ->> 'window_seconds')::integer;
    if subject_value is null or length(subject_value) < 1 or length(subject_value) > 512
      or scope_value is null or length(scope_value) < 1 or length(scope_value) > 100
      or units_value < 1 or limit_value < 1
      or window_seconds_value < 1 or window_seconds_value > 604800 then
      raise exception 'invalid rate-limit policy';
    end if;
    subject_hash_value := encode(digest(subject_value, 'sha256'), 'hex');
    window_epoch := floor(extract(epoch from transaction_timestamp()) / window_seconds_value)::bigint * window_seconds_value;
    window_start_value := to_timestamp(window_epoch);
    perform pg_advisory_xact_lock(hashtextextended(
      subject_hash_value || ':' || scope_value || ':' || window_epoch::text || ':' || window_seconds_value::text,
      0
    ));
  end loop;

  -- Check every policy before incrementing any bucket. A rejected request is
  -- therefore never partially charged.
  for policy in select value from jsonb_array_elements(limit_policies)
  loop
    subject_value := policy ->> 'subject';
    subject_hash_value := encode(digest(subject_value, 'sha256'), 'hex');
    scope_value := policy ->> 'scope';
    units_value := coalesce((policy ->> 'units')::bigint, 1);
    limit_value := (policy ->> 'limit')::bigint;
    window_seconds_value := (policy ->> 'window_seconds')::integer;
    window_epoch := floor(extract(epoch from transaction_timestamp()) / window_seconds_value)::bigint * window_seconds_value;
    window_start_value := to_timestamp(window_epoch);
    window_end_value := window_start_value + make_interval(secs => window_seconds_value);
    current_units := 0;
    select b.units into current_units
      from public.rate_limit_buckets b
      where b.subject_hash = subject_hash_value
        and b.scope = scope_value
        and b.window_start = window_start_value
        and b.window_seconds = window_seconds_value;
    current_units := coalesce(current_units, 0);
    if current_units + units_value > limit_value then
      retry_after_seconds := greatest(1, ceil(extract(epoch from window_end_value - clock_timestamp()))::integer);
      return jsonb_build_object('allowed', false, 'remaining', greatest(0, limit_value - current_units), 'retry_after', retry_after_seconds);
    end if;
    remaining_units := limit_value - current_units - units_value;
    minimum_remaining := case
      when minimum_remaining is null then remaining_units
      else least(minimum_remaining, remaining_units)
    end;
  end loop;

  for policy in select value from jsonb_array_elements(limit_policies)
  loop
    subject_value := policy ->> 'subject';
    subject_hash_value := encode(digest(subject_value, 'sha256'), 'hex');
    scope_value := policy ->> 'scope';
    units_value := coalesce((policy ->> 'units')::bigint, 1);
    window_seconds_value := (policy ->> 'window_seconds')::integer;
    window_epoch := floor(extract(epoch from transaction_timestamp()) / window_seconds_value)::bigint * window_seconds_value;
    window_start_value := to_timestamp(window_epoch);
    window_end_value := window_start_value + make_interval(secs => window_seconds_value);
    insert into public.rate_limit_buckets (
      subject_hash, scope, window_start, window_seconds, units, expires_at, updated_at
    ) values (
      subject_hash_value, scope_value, window_start_value, window_seconds_value,
      units_value, window_end_value + interval '1 day', now()
    )
    on conflict (subject_hash, scope, window_start, window_seconds)
    do update set
      units = public.rate_limit_buckets.units + excluded.units,
      expires_at = excluded.expires_at,
      updated_at = now();
  end loop;

  -- Amortized cleanup keeps the fixed-window table bounded without requiring a
  -- separate scheduler.
  if random() < 0.01 then
    delete from public.rate_limit_buckets
    where ctid in (
      select ctid from public.rate_limit_buckets
      where expires_at < now()
      order by expires_at
      limit 1000
    );
  end if;

  return jsonb_build_object('allowed', true, 'remaining', coalesce(minimum_remaining, 0), 'retry_after', 0);
end;
$$;

revoke all on function public.consume_rate_limits(jsonb) from public, anon, authenticated;
grant execute on function public.consume_rate_limits(jsonb) to service_role;

drop function if exists public.consume_ai_quota(uuid, text, integer, integer, integer);
create function public.consume_ai_quota(
  quota_user_id uuid,
  quota_feature text,
  quota_units integer,
  quota_hourly integer,
  quota_daily integer,
  quota_all_hourly integer,
  quota_all_daily integer
) returns boolean language plpgsql security definer set search_path = public as $$
declare
  feature_hourly_units bigint;
  feature_daily_units bigint;
  all_hourly_units bigint;
  all_daily_units bigint;
begin
  if quota_units < 1 or quota_hourly < 1 or quota_daily < 1
    or quota_all_hourly < 1 or quota_all_daily < 1 then
    raise exception 'invalid AI quota';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('ai-question:' || quota_user_id::text, 0));
  select coalesce(sum(units), 0) into feature_hourly_units from public.quiz_generation_events
    where user_id = quota_user_id and feature = quota_feature and created_at >= now() - interval '1 hour';
  select coalesce(sum(units), 0) into feature_daily_units from public.quiz_generation_events
    where user_id = quota_user_id and feature = quota_feature and created_at >= now() - interval '24 hours';
  select coalesce(sum(units), 0) into all_hourly_units from public.quiz_generation_events
    where user_id = quota_user_id and created_at >= now() - interval '1 hour';
  select coalesce(sum(units), 0) into all_daily_units from public.quiz_generation_events
    where user_id = quota_user_id and created_at >= now() - interval '24 hours';
  if feature_hourly_units + quota_units > quota_hourly
    or feature_daily_units + quota_units > quota_daily
    or all_hourly_units + quota_units > quota_all_hourly
    or all_daily_units + quota_units > quota_all_daily then
    return false;
  end if;
  insert into public.quiz_generation_events (user_id, feature, units)
    values (quota_user_id, quota_feature, quota_units);
  return true;
end;
$$;

revoke all on function public.consume_ai_quota(uuid, text, integer, integer, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_ai_quota(uuid, text, integer, integer, integer, integer, integer) to service_role;

commit;
