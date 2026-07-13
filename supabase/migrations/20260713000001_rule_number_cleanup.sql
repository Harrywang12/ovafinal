begin;

-- The original parser treated any number as a rule number, including page,
-- score, and numbered-list values. Keep only explicitly labelled Rule values.
update public.rule_chunks
set rule_number = null
where rule_number is not null
  and chunk_text !~* '\mRule\s+[0-9]+(\.[0-9]+){0,4}\M';

commit;
