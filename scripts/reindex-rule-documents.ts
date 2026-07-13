import { createClient } from "@supabase/supabase-js";
import { embedChunks } from "../lib/embeddings";
import { buildRuleIndexChunks, extractPdfPages } from "../lib/rule-indexing";

async function main() {
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !serviceKey || !process.env.OPENAI_API_KEY) {
  throw new Error("SUPABASE_URL, SUPABASE_SERVICE_KEY, and OPENAI_API_KEY are required");
}

const requestedId = process.argv.find((value) => value.startsWith("--document-id="))?.split("=")[1];
const supabase = createClient(supabaseUrl, serviceKey);
let query = supabase.from("rule_documents")
  .select("id, title, discipline, storage_path, active_index_version")
  .not("storage_path", "is", null)
  .order("created_at");
if (requestedId) query = query.eq("id", requestedId);
const { data: documents, error } = await query;
if (error) throw error;

for (const document of documents || []) {
  if (!document.storage_path) continue;
  const nextVersion = Number(document.active_index_version || 1) + 1;
  console.info(`Reindexing ${document.title} as version ${nextVersion}`);
  const { data: file, error: downloadError } = await supabase.storage.from("rules").download(document.storage_path);
  if (downloadError || !file) throw downloadError || new Error("Rulebook download failed");

  const pages = await extractPdfPages(Buffer.from(await file.arrayBuffer()));
  const chunks = buildRuleIndexChunks(pages, document.discipline as "indoor" | "beach");
  if (!chunks.length) throw new Error(`No indexable rule sections found in ${document.title}`);
  const embeddings = await embedChunks(chunks.map((chunk) => chunk.chunkText));

  await supabase.from("rule_chunks").delete().eq("document_id", document.id).eq("index_version", nextVersion);
  try {
    for (let offset = 0; offset < chunks.length; offset += 50) {
      const rows = chunks.slice(offset, offset + 50).map((chunk, relativeIndex) => ({
        document_id: document.id,
        chunk_text: chunk.chunkText,
        embedding: embeddings[offset + relativeIndex],
        page_number: chunk.pageNumber,
        rule_number: chunk.ruleNumber,
        section_title: chunk.sectionTitle,
        case_number: chunk.caseNumber,
        topic: chunk.topic,
        topic_tags: chunk.topicTags,
        ruleset: chunk.ruleset,
        minimum_referee_level: "level_1",
        maximum_referee_level: "level_4",
        index_version: nextVersion,
        chunk_index: offset + relativeIndex,
        content_hash: chunk.contentHash,
      }));
      const { error: insertError } = await supabase.from("rule_chunks").insert(rows);
      if (insertError) throw insertError;
    }

    const standardCount = chunks.filter((chunk) => document.discipline === "beach" ? chunk.ruleset === "beach" : chunk.ruleset === "standard_indoor").length;
    const taggedCount = chunks.filter((chunk) => chunk.topicTags.length > 0).length;
    if (!standardCount || !taggedCount) throw new Error(`Coverage check failed for ${document.title}`);
    const { error: activateError } = await supabase.from("rule_documents")
      .update({ active_index_version: nextVersion })
      .eq("id", document.id)
      .eq("active_index_version", document.active_index_version);
    if (activateError) throw activateError;
    console.info(`Activated ${chunks.length} chunks (${taggedCount} topic-tagged, ${standardCount} main-ruleset)`);
  } catch (indexError) {
    await supabase.from("rule_chunks").delete().eq("document_id", document.id).eq("index_version", nextVersion);
    throw indexError;
  }
}
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
