-- Migration: admin-configurable answer window for video questions
-- Date: 2026-07-08
-- When null, the app falls back to the difficulty-based default.

begin;

alter table if exists public.video_questions
  add column if not exists answer_window_seconds integer
  check (answer_window_seconds is null or answer_window_seconds > 0);

commit;
