begin;

-- Allow the FTS/trigram index builds on projects with a 32 MB default,
-- without changing the database-wide maintenance memory setting.
set local maintenance_work_mem = '96MB';

create extension if not exists pg_trgm;

-- Keep legacy vectors for rollback, but new ingestion and runtime retrieval do not use them.
alter table public.rule_chunks alter column embedding drop not null;

alter table public.rule_chunks
  add column if not exists search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(rule_number, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(section_title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(topic, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(case_number, '')), 'B') ||
    setweight(to_tsvector('english', chunk_text), 'C')
  ) stored;

create index if not exists rule_chunks_search_vector_idx on public.rule_chunks using gin (search_vector);
create index if not exists rule_chunks_rule_number_trgm_idx on public.rule_chunks using gin (rule_number gin_trgm_ops);
create index if not exists rule_chunks_section_title_trgm_idx on public.rule_chunks using gin (section_title gin_trgm_ops);
create index if not exists rule_chunks_eligibility_idx
  on public.rule_chunks (ruleset, topic, minimum_referee_level, maximum_referee_level, document_id, index_version);

drop function if exists public.search_rule_chunks_fts(text, integer, text, text, text[], text, text[], uuid[]);
create function public.search_rule_chunks_fts(
  search_query text default null,
  match_count integer default 6,
  filter_discipline text default null,
  filter_referee_level text default null,
  filter_document_types text[] default null,
  filter_topic text default null,
  filter_rulesets text[] default null,
  exclude_chunk_ids uuid[] default null
) returns table (
  id uuid,
  document_id uuid,
  document_title text,
  document_type text,
  discipline text,
  ruleset text,
  chunk_text text,
  page_number integer,
  rule_number text,
  section_title text,
  case_number text,
  topic text,
  topic_tags text[],
  source_url text,
  storage_path text,
  index_version integer,
  chunk_index integer,
  content_hash text,
  similarity double precision
) language sql stable as $$
  with query as (
    select case
      when nullif(btrim(search_query), '') is null then null::tsquery
      else websearch_to_tsquery('english', search_query)
    end as terms
  )
  select c.id, c.document_id, d.title, d.document_type, d.discipline, c.ruleset,
    c.chunk_text, c.page_number, c.rule_number, c.section_title, c.case_number,
    c.topic, c.topic_tags, d.source_url, d.storage_path, c.index_version, c.chunk_index,
    c.content_hash,
    (case when q.terms is null then 0.0 else ts_rank_cd(c.search_vector, q.terms, 32) end
      + case when filter_topic is not null and (c.topic = filter_topic or filter_topic = any(c.topic_tags)) then 1.0 else 0.0 end
      + case when nullif(btrim(search_query), '') is not null then
          greatest(similarity(coalesce(c.rule_number, ''), search_query), similarity(coalesce(c.section_title, ''), search_query)) * 0.25
        else 0.0 end)::double precision as similarity
  from public.rule_chunks c
  join public.rule_documents d on d.id = c.document_id
  cross join query q
  where c.index_version = d.active_index_version
    and (filter_discipline is null or d.discipline = filter_discipline)
    and (filter_document_types is null or d.document_type = any(filter_document_types))
    and (filter_rulesets is null or c.ruleset = any(filter_rulesets))
    and (filter_topic is null or c.topic = filter_topic or filter_topic = any(c.topic_tags))
    and (exclude_chunk_ids is null or not (c.id = any(exclude_chunk_ids)))
    and (
      filter_referee_level is null
      or (
        coalesce(nullif(substring(c.minimum_referee_level from '[0-9]+'), ''), '1')::integer <= substring(filter_referee_level from '[0-9]+')::integer
        and coalesce(nullif(substring(c.maximum_referee_level from '[0-9]+'), ''), '4')::integer >= substring(filter_referee_level from '[0-9]+')::integer
      )
    )
    and (q.terms is null or c.search_vector @@ q.terms
      or similarity(coalesce(c.rule_number, ''), search_query) > 0.25
      or similarity(coalesce(c.section_title, ''), search_query) > 0.2)
  order by similarity desc, c.rule_number nulls last, c.chunk_index
  limit greatest(1, least(match_count, 50));
$$;

alter table public.quiz_question_history
  add column if not exists blueprint_fingerprint text;
create index if not exists quiz_question_history_blueprint_idx
  on public.quiz_question_history (user_id, scope, discipline, referee_level, blueprint_fingerprint, created_at desc);

create table if not exists public.quiz_blueprint_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null check (scope in ('adaptive', 'module', 'program')),
  module_id text,
  quiz_session_id uuid references public.quiz_sessions(id) on delete cascade,
  blueprint_fingerprint text not null,
  source_chunk_id uuid not null references public.rule_chunks(id) on delete cascade,
  rule_id text not null,
  question_style text not null,
  scenario_type text not null,
  referee_role text not null,
  decision_type text not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists quiz_blueprint_reservations_active_unique
  on public.quiz_blueprint_reservations (user_id, blueprint_fingerprint)
  where released_at is null;
create index if not exists quiz_blueprint_reservations_user_recent_idx
  on public.quiz_blueprint_reservations (user_id, scope, created_at desc);

create or replace function public.reserve_quiz_blueprint(
  reservation_user_id uuid,
  reservation_scope text,
  reservation_module_id text,
  reservation_quiz_session_id uuid,
  reservation_fingerprint text,
  reservation_source_chunk_id uuid,
  reservation_rule_id text,
  reservation_question_style text,
  reservation_scenario_type text,
  reservation_referee_role text,
  reservation_decision_type text,
  reservation_minutes integer default 30
) returns uuid language plpgsql security definer set search_path = public as $$
declare reservation_id uuid;
begin
  update public.quiz_blueprint_reservations
    set released_at = now()
    where user_id = reservation_user_id and released_at is null
      and (expires_at < now() or (accepted_at is not null and accepted_at < now() - interval '30 days'));
  insert into public.quiz_blueprint_reservations (
    user_id, scope, module_id, quiz_session_id, blueprint_fingerprint, source_chunk_id,
    rule_id, question_style, scenario_type, referee_role, decision_type, expires_at
  ) values (
    reservation_user_id, reservation_scope, reservation_module_id, reservation_quiz_session_id,
    reservation_fingerprint, reservation_source_chunk_id, reservation_rule_id,
    reservation_question_style, reservation_scenario_type, reservation_referee_role,
    reservation_decision_type, now() + make_interval(mins => greatest(1, reservation_minutes))
  ) on conflict do nothing returning id into reservation_id;
  return reservation_id;
end;
$$;

create table if not exists public.ai_request_telemetry (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  request_type text not null,
  model text not null,
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  cache_hit_tokens integer,
  cache_miss_tokens integer,
  latency_ms integer not null,
  attempt integer not null default 1,
  outcome text not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_request_telemetry_created_idx on public.ai_request_telemetry (created_at desc, request_type);

create table if not exists public.quiz_generation_telemetry (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  flow text not null,
  attempt integer not null,
  blueprint_fingerprint text,
  outcome text not null,
  rejection_stage text,
  rejection_reason text,
  created_at timestamptz not null default now()
);
create index if not exists quiz_generation_telemetry_created_idx
  on public.quiz_generation_telemetry (created_at desc, flow, outcome);

alter table public.quiz_generation_events
  add column if not exists feature text not null default 'quiz_question';
create index if not exists quiz_generation_events_feature_lookup_idx
  on public.quiz_generation_events (user_id, feature, created_at desc);

create or replace function public.consume_ai_quota(
  quota_user_id uuid,
  quota_feature text,
  quota_units integer,
  quota_hourly integer,
  quota_daily integer
) returns boolean language plpgsql security definer set search_path = public as $$
declare hourly_units integer;
declare daily_units integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(quota_user_id::text || ':' || quota_feature, 0));
  select coalesce(sum(units), 0) into hourly_units from public.quiz_generation_events
    where user_id = quota_user_id and feature = quota_feature and created_at >= now() - interval '1 hour';
  select coalesce(sum(units), 0) into daily_units from public.quiz_generation_events
    where user_id = quota_user_id and feature = quota_feature and created_at >= now() - interval '24 hours';
  if hourly_units + quota_units > quota_hourly or daily_units + quota_units > quota_daily then
    return false;
  end if;
  insert into public.quiz_generation_events (user_id, feature, units) values (quota_user_id, quota_feature, quota_units);
  return true;
end;
$$;

revoke all on function public.consume_ai_quota(uuid, text, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_ai_quota(uuid, text, integer, integer, integer) to service_role;

alter table public.quiz_blueprint_reservations enable row level security;
alter table public.ai_request_telemetry enable row level security;
alter table public.quiz_generation_telemetry enable row level security;

create policy "users read own blueprint reservations" on public.quiz_blueprint_reservations for select using (auth.uid() = user_id or public.is_admin());
create policy "admins read ai telemetry" on public.ai_request_telemetry for select using (public.is_admin());
create policy "admins read quiz generation telemetry" on public.quiz_generation_telemetry for select using (public.is_admin());
revoke all on function public.reserve_quiz_blueprint(uuid, text, text, uuid, text, uuid, text, text, text, text, text, integer) from public, anon, authenticated;
grant execute on function public.reserve_quiz_blueprint(uuid, text, text, uuid, text, uuid, text, text, text, text, text, integer) to service_role;

commit;
