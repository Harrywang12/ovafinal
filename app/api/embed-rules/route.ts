import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminFromRequest } from "../../../lib/admin";
import { embedChunks } from "../../../lib/embeddings";
import { quizDisciplineSchema, refereeLevelSchema } from "../../../lib/quiz-programs";
import { buildRuleIndexChunks, extractPdfPages } from "../../../lib/rule-indexing";
import { getServerSupabase } from "../../../lib/supabase";
import { assertEnv } from "../../../lib/utils";

export const runtime = "nodejs";
export const maxDuration = 300;

const inputSchema = z.object({
  path: z.string().min(1),
  title: z.string().trim().min(1),
  discipline: quizDisciplineSchema,
  documentType: z.string().trim().min(1),
  effectiveYear: z.string().trim().optional(),
  sourceUrl: z.string().url().optional(),
  topic: z.string().trim().optional(),
  minimumRefereeLevel: refereeLevelSchema.optional(),
  maximumRefereeLevel: refereeLevelSchema.optional(),
});

export async function POST(request: Request) {
  let documentId: string | null = null;
  try {
    assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY", "OPENAI_API_KEY"]);
    const admin = await requireAdminFromRequest(request);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
    const parsed = inputSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid document metadata" }, { status: 400 });
    const input = parsed.data;
    const supabase = getServerSupabase();
    const { data, error } = await supabase.storage.from("rules").download(input.path);
    if (error || !data) throw error || new Error("Rulebook download failed");
    const buffer = Buffer.from(await data.arrayBuffer());
    if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") return NextResponse.json({ error: "Stored file is not a PDF" }, { status: 415 });
    const pages = await extractPdfPages(buffer);
    const chunks = buildRuleIndexChunks(pages, input.discipline);
    if (!chunks.length) return NextResponse.json({ error: "No usable text was extracted from the PDF" }, { status: 422 });
    const embeddings = await embedChunks(chunks.map((chunk) => chunk.chunkText));

    const { data: document, error: documentError } = await supabase.from("rule_documents").insert({
      title: input.title, discipline: input.discipline, document_type: input.documentType,
      effective_year: input.effectiveYear || null, source_url: input.sourceUrl || null,
      storage_path: input.path, created_by: admin.userId,
    }).select("id").single();
    if (documentError) throw documentError;
    documentId = document.id;
    const { error: chunkError } = await supabase.from("rule_chunks").insert(chunks.map((chunk, index) => ({
      document_id: document.id,
      chunk_text: chunk.chunkText,
      embedding: embeddings[index],
      page_number: chunk.pageNumber,
      rule_number: chunk.ruleNumber,
      section_title: chunk.sectionTitle,
      case_number: chunk.caseNumber,
      topic: input.topic || chunk.topic,
      topic_tags: input.topic ? [input.topic] : chunk.topicTags,
      ruleset: chunk.ruleset,
      index_version: 1,
      chunk_index: index,
      content_hash: chunk.contentHash,
      minimum_referee_level: input.minimumRefereeLevel || "level_1",
      maximum_referee_level: input.maximumRefereeLevel || "level_4",
    })));
    if (chunkError) throw chunkError;
    return NextResponse.json({ documentId: document.id, inserted: chunks.length, pageMetadataAvailable: true });
  } catch (error) {
    if (documentId) await getServerSupabase().from("rule_documents").delete().eq("id", documentId);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Rulebook embedding failed" }, { status: 500 });
  }
}
