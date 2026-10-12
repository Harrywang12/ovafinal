import { getServerSupabase } from "./supabase";
import type { RuleSet } from "./rule-source-classification";

export interface RetrievedRuleChunk {
  id: string;
  document_id: string;
  document_title: string;
  document_type: string;
  discipline: "indoor" | "beach";
  ruleset: RuleSet;
  chunk_text: string;
  page_number: number | null;
  rule_number: string | null;
  section_title: string | null;
  case_number: string | null;
  topic: string | null;
  topic_tags: string[];
  source_url: string | null;
  storage_path: string | null;
  index_version: number;
  chunk_index: number | null;
  content_hash: string | null;
  similarity: number;
}

export type RuleSearchFilters = {
  discipline: "indoor" | "beach";
  refereeLevel: "level_1" | "level_2" | "level_3" | "level_4";
  documentTypes?: string[];
  topic?: string;
  rulesets?: RuleSet[];
  excludeChunkIds?: string[];
};

export async function searchRuleChunks(
  query: string,
  filters: RuleSearchFilters,
  limit = 6
): Promise<RetrievedRuleChunk[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase.rpc("search_rule_chunks_fts", {
    search_query: query || null,
    match_count: limit,
    filter_discipline: filters.discipline,
    filter_referee_level: filters.refereeLevel,
    filter_document_types: filters.documentTypes?.length ? filters.documentTypes : null,
    filter_topic: filters.topic || null,
    filter_rulesets: filters.rulesets?.length ? filters.rulesets : null,
    exclude_chunk_ids: filters.excludeChunkIds?.length ? filters.excludeChunkIds : null,
  });
  if (error) throw error;
  return (data as RetrievedRuleChunk[]) || [];
}

export async function listAvailableRuleTopics(filters: Pick<RuleSearchFilters, "discipline" | "refereeLevel" | "rulesets">) {
  const supabase = getServerSupabase();
  const { data, error } = await supabase.rpc("list_available_rule_topics", {
    filter_discipline: filters.discipline,
    filter_referee_level: filters.refereeLevel,
    filter_rulesets: filters.rulesets?.length ? filters.rulesets : null,
  });
  if (error) throw error;
  return (data || []) as Array<{ topic: string; chunk_count: number }>;
}
