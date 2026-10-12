begin;

-- AI request and quiz-generation telemetry is append-only. Keep a rolling
-- window instead of letting both tables grow forever. Change the interval in
-- the cron command below to keep more or less history.

create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.prune_ai_telemetry(retention interval default interval '90 days')
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.ai_request_telemetry where created_at < now() - retention;
  delete from public.quiz_generation_telemetry where created_at < now() - retention;
  -- The quota ledger is only read for the last 24 hours.
  delete from public.quiz_generation_events where created_at < now() - interval '7 days';
end;
$$;

revoke all on function public.prune_ai_telemetry(interval) from public, anon, authenticated;
grant execute on function public.prune_ai_telemetry(interval) to service_role;

-- Re-scheduling a job with the same name replaces it, so this is safe to rerun.
select cron.schedule(
  'prune-ai-telemetry',
  '17 3 * * *',
  $$select public.prune_ai_telemetry(interval '90 days')$$
);

-- Clear the existing backlog now rather than waiting for the first run.
select public.prune_ai_telemetry(interval '90 days');

commit;
