begin;

-- Supabase installs pgcrypto in the extensions schema. Keep the security
-- definer search path explicit and trusted so digest() resolves correctly.
alter function public.consume_rate_limits(jsonb)
  set search_path = pg_catalog, extensions, pg_temp;

commit;
