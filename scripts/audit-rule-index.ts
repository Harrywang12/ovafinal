import { createClient } from "@supabase/supabase-js";
import { buildRuleIndexChunks, extractPdfPages } from "../lib/rule-indexing";

async function main() {
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !serviceKey) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY are required");
const supabase = createClient(supabaseUrl, serviceKey);
const { data: documents, error } = await supabase.from("rule_documents")
  .select("title, discipline, storage_path").not("storage_path", "is", null).order("created_at");
if (error) throw error;

for (const document of documents || []) {
  if (!document.storage_path) continue;
  const { data: file, error: downloadError } = await supabase.storage.from("rules").download(document.storage_path);
  if (downloadError || !file) throw downloadError || new Error("Rulebook download failed");
  const pages = await extractPdfPages(Buffer.from(await file.arrayBuffer()));
  const chunks = buildRuleIndexChunks(pages, document.discipline as "indoor" | "beach");
  const rulesets: Record<string, number> = {};
  const topics: Record<string, number> = {};
  for (const chunk of chunks) {
    rulesets[chunk.ruleset] = (rulesets[chunk.ruleset] || 0) + 1;
    for (const topic of chunk.topicTags) topics[topic] = (topics[topic] || 0) + 1;
  }
  console.info(JSON.stringify({ title: document.title, pages: pages.length, chunks: chunks.length, rulesets, topics }, null, 2));
}
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
