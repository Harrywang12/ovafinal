import { embedText } from "./embeddings";
import { getServerSupabase } from "./supabase";

export interface RetrievedChunk {
  chunk: string;
  similarity: number;
}

export interface RetrievedRuleChunk {
  id: string;
  document_id: string;
  document_title: string;
  document_type: string;
  discipline: "indoor" | "beach";
  chunk_text: string;
  page_number: number | null;
  rule_number: string | null;
  section_title: string | null;
  case_number: string | null;
  topic: string | null;
  source_url: string | null;
  storage_path: string | null;
  similarity: number;
}

export type RuleSearchFilters = {
  discipline: "indoor" | "beach";
  refereeLevel: "level_1" | "level_2" | "level_3" | "level_4";
  documentTypes?: string[];
  topic?: string;
};

export function chunkText(text: string, chunkSize = 800, overlap = 80): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let i = 0;
  while (i < words.length) {
    const slice = words.slice(i, i + chunkSize).join(" ");
    chunks.push(slice);
    i += chunkSize - overlap;
  }
  return chunks;
}

export async function searchRules(query: string, limit = 5): Promise<RetrievedChunk[]> {
  const supabase = getServerSupabase();
  const queryEmbedding = await embedText(query);
  const { data, error } = await supabase.rpc("match_rules", {
    query_embedding: queryEmbedding,
    match_count: limit
  });
  if (error) {
    throw error;
  }
  return (data as RetrievedChunk[]) || [];
}

export async function searchRuleChunks(
  query: string,
  filters: RuleSearchFilters,
  limit = 6
): Promise<RetrievedRuleChunk[]> {
  const supabase = getServerSupabase();
  const queryEmbedding = await embedText(query);
  const { data, error } = await supabase.rpc("match_rule_chunks", {
    query_embedding: queryEmbedding,
    match_count: limit,
    filter_discipline: filters.discipline,
    filter_referee_level: filters.refereeLevel,
    filter_document_types: filters.documentTypes?.length ? filters.documentTypes : null,
    filter_topic: filters.topic || null,
  });
  if (error) throw error;
  return (data as RetrievedRuleChunk[]) || [];
}
