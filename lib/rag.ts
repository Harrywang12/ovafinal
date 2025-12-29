import { embedText } from "./embeddings";
import { getServerSupabase } from "./supabase";

export interface RetrievedChunk {
  chunk: string;
  similarity: number;
}

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
