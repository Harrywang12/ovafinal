begin;

-- Forward cleanup for environments where the tutor persistence migration was applied.
-- This intentionally deletes stored tutor conversations and their messages.
drop table if exists public.chatbot_messages cascade;
drop table if exists public.chatbot_conversations cascade;

-- Remove the superseded tutor-era retrieval and lesson-content stores. Current
-- rule retrieval uses rule_chunks/search_rule_chunks_fts, while module lessons
-- are maintained in lib/module-content.ts.
drop function if exists public.match_rules(vector, integer);
drop table if exists public.rules_embeddings cascade;
drop table if exists public.lessons cascade;

-- Remove tutor-only usage records while preserving quiz and video telemetry.
delete from public.quiz_generation_events where feature = 'chatbot';
delete from public.ai_request_telemetry where request_type like 'chatbot_%';

commit;
