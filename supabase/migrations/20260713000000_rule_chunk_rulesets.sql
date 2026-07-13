begin;

alter table public.rule_chunks
  add column if not exists ruleset text;

update public.rule_chunks c
set ruleset = case
  when d.discipline = 'beach' then 'beach'
  when c.chunk_text ~* '\m(4v4|4 v 4|four[- ]a[- ]side|diamond formation)\M'
    and c.chunk_text ~* '\m(rallyball|tripleball|three[- ]ball sequence|tossed ball|tosser)\M'
    then 'rallyball_4v4'
  when c.chunk_text ~* '\m(6v6|6 v 6|six[- ]a[- ]side|designated setter position)\M'
    and c.chunk_text ~* '\m(rallyball|tripleball|three[- ]ball sequence|tossed ball|tosser)\M'
    then 'rallyball_6v6'
  when c.chunk_text ~* '\m(rallyball|tripleball|three[- ]ball sequence|tossed ball|tosser)\M'
    or c.chunk_text ~* 'free ball (is )?(introduced|tossed)'
    then 'rallyball_unspecified'
  when c.chunk_text ~* '\m(coed|reverse coed|recreational variation|snow volleyball|sitting volleyball)\M'
    then 'indoor_variation'
  else 'standard_indoor'
end
from public.rule_documents d
where d.id = c.document_id
  and c.ruleset is null;

alter table public.rule_chunks
  alter column ruleset set not null;

alter table public.rule_chunks
  drop constraint if exists rule_chunks_ruleset_check;

alter table public.rule_chunks
  add constraint rule_chunks_ruleset_check check (
    ruleset in (
      'standard_indoor',
      'beach',
      'rallyball_4v4',
      'rallyball_6v6',
      'rallyball_unspecified',
      'indoor_variation'
    )
  );

create index if not exists rule_chunks_ruleset_topic_idx
  on public.rule_chunks (ruleset, topic);

drop function if exists public.match_rule_chunks(vector(1536), integer, text, text, text[], text);
drop function if exists public.match_rule_chunks(vector(1536), integer, text, text, text[], text, text[]);

create function public.match_rule_chunks(
  query_embedding vector(1536),
  match_count integer default 5,
  filter_discipline text default null,
  filter_referee_level text default null,
  filter_document_types text[] default null,
  filter_topic text default null,
  filter_rulesets text[] default null
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
  source_url text,
  storage_path text,
  similarity double precision
) language sql stable as $$
  select c.id, c.document_id, d.title, d.document_type, d.discipline, c.ruleset,
    c.chunk_text, c.page_number, c.rule_number, c.section_title, c.case_number,
    c.topic, d.source_url, d.storage_path,
    1 - (c.embedding <=> query_embedding)
  from public.rule_chunks c
  join public.rule_documents d on d.id = c.document_id
  where (filter_discipline is null or d.discipline = filter_discipline)
    and (filter_document_types is null or d.document_type = any(filter_document_types))
    and (filter_rulesets is null or c.ruleset = any(filter_rulesets))
    and (filter_topic is null or c.topic is null or c.topic = filter_topic)
    and (
      filter_referee_level is null
      or (
        coalesce(nullif(substring(c.minimum_referee_level from '[0-9]+'), ''), '1')::integer <= substring(filter_referee_level from '[0-9]+')::integer
        and coalesce(nullif(substring(c.maximum_referee_level from '[0-9]+'), ''), '4')::integer >= substring(filter_referee_level from '[0-9]+')::integer
      )
    )
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

commit;
