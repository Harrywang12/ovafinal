begin;

alter table public.rule_documents
  add column if not exists active_index_version integer not null default 1 check (active_index_version > 0);

alter table public.rule_chunks
  add column if not exists index_version integer not null default 1 check (index_version > 0),
  add column if not exists chunk_index integer,
  add column if not exists content_hash text,
  add column if not exists topic_tags text[] not null default '{}';

create index if not exists rule_chunks_active_lookup_idx
  on public.rule_chunks (document_id, index_version, ruleset, topic);

create index if not exists rule_chunks_topic_tags_idx
  on public.rule_chunks using gin (topic_tags);

create unique index if not exists rule_chunks_document_version_index_unique
  on public.rule_chunks (document_id, index_version, chunk_index)
  where chunk_index is not null;

alter table public.quiz_question_history
  add column if not exists question_style text,
  add column if not exists source_chunk_ids uuid[],
  add column if not exists source_fact_fingerprint text,
  add column if not exists concept_fingerprint text;

create index if not exists quiz_question_history_exact_signature_idx
  on public.quiz_question_history (user_id, scope, question_signature);

create index if not exists quiz_question_history_source_fact_idx
  on public.quiz_question_history (user_id, scope, discipline, referee_level, source_fact_fingerprint, created_at desc);

create index if not exists quiz_question_history_concept_idx
  on public.quiz_question_history (user_id, scope, discipline, referee_level, concept_fingerprint, created_at desc);

alter table public.generated_quiz_questions
  add column if not exists scope text not null default 'adaptive',
  add column if not exists module_id text;

alter table public.generated_quiz_questions
  drop constraint if exists generated_quiz_questions_scope_check;

alter table public.generated_quiz_questions
  add constraint generated_quiz_questions_scope_check
  check (scope in ('adaptive', 'module'));

alter table public.generated_quiz_questions
  drop constraint if exists generated_quiz_questions_module_scope_check;

alter table public.generated_quiz_questions
  add constraint generated_quiz_questions_module_scope_check
  check (
    (scope = 'adaptive' and module_id is null)
    or (scope = 'module' and module_id is not null)
  );

create index if not exists generated_quiz_questions_module_idx
  on public.generated_quiz_questions (user_id, module_id, created_at desc)
  where scope = 'module';

drop function if exists public.match_rule_chunks(vector(1536), integer, text, text, text[], text);
drop function if exists public.match_rule_chunks(vector(1536), integer, text, text, text[], text, text[]);
drop function if exists public.match_rule_chunks(vector(1536), integer, text, text, text[], text, text[], uuid[]);

create function public.match_rule_chunks(
  query_embedding vector(1536),
  match_count integer default 5,
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
  select c.id, c.document_id, d.title, d.document_type, d.discipline, c.ruleset,
    c.chunk_text, c.page_number, c.rule_number, c.section_title, c.case_number,
    c.topic, c.topic_tags, d.source_url, d.storage_path, c.index_version, c.chunk_index,
    c.content_hash, 1 - (c.embedding <=> query_embedding)
  from public.rule_chunks c
  join public.rule_documents d on d.id = c.document_id
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
  order by c.embedding <=> query_embedding
  limit greatest(1, least(match_count, 50));
$$;

create or replace function public.list_available_rule_topics(
  filter_discipline text,
  filter_referee_level text,
  filter_rulesets text[] default null
) returns table (topic text, chunk_count bigint)
language sql stable as $$
  select available.topic, count(*)
  from public.rule_chunks c
  join public.rule_documents d on d.id = c.document_id
  cross join lateral unnest(
    case when cardinality(c.topic_tags) > 0 then c.topic_tags else array[c.topic] end
  ) as available(topic)
  where c.index_version = d.active_index_version
    and available.topic is not null
    and d.discipline = filter_discipline
    and (filter_rulesets is null or c.ruleset = any(filter_rulesets))
    and (
      coalesce(nullif(substring(c.minimum_referee_level from '[0-9]+'), ''), '1')::integer <= substring(filter_referee_level from '[0-9]+')::integer
      and coalesce(nullif(substring(c.maximum_referee_level from '[0-9]+'), ''), '4')::integer >= substring(filter_referee_level from '[0-9]+')::integer
    )
  group by available.topic
  order by available.topic;
$$;

commit;
