import { NextResponse } from "next/server";
import pdf from "pdf-parse";
import { z } from "zod";
import { requireAdminFromRequest } from "../../../lib/admin";
import { embedChunks } from "../../../lib/embeddings";
import { quizDisciplineSchema, refereeLevelSchema } from "../../../lib/quiz-programs";
import { chunkText } from "../../../lib/rag";
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

function chunkMetadata(chunk: string) {
  const rule = chunk.match(/\b(?:Rule\s+)?(\d+(?:\.\d+){0,4})\b/i)?.[1] || null;
  const caseNumber = chunk.match(/\bCase\s+(\d+(?:\.\d+)*)\b/i)?.[1] || null;
  const firstLine = chunk.split(/\n/).map((line) => line.trim()).find((line) => line.length >= 4 && line.length <= 120);
  return { rule_number: rule, case_number: caseNumber, section_title: firstLine || null };
}

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
    const parsedPdf = await pdf(buffer);
    const chunks = chunkText(parsedPdf.text).filter((chunk) => chunk.trim().length >= 80);
    if (!chunks.length) return NextResponse.json({ error: "No usable text was extracted from the PDF" }, { status: 422 });
    const embeddings = await embedChunks(chunks);

    const { data: document, error: documentError } = await supabase.from("rule_documents").insert({
      title: input.title, discipline: input.discipline, document_type: input.documentType,
      effective_year: input.effectiveYear || null, source_url: input.sourceUrl || null,
      storage_path: input.path, created_by: admin.userId,
    }).select("id").single();
    if (documentError) throw documentError;
    documentId = document.id;
    const { error: chunkError } = await supabase.from("rule_chunks").insert(chunks.map((chunk, index) => ({
      document_id: document.id,
      chunk_text: chunk,
      embedding: embeddings[index],
      page_number: null,
      topic: input.topic || null,
      minimum_referee_level: input.minimumRefereeLevel || "level_1",
      maximum_referee_level: input.maximumRefereeLevel || "level_4",
      ...chunkMetadata(chunk),
    })));
    if (chunkError) throw chunkError;
    return NextResponse.json({ documentId: document.id, inserted: chunks.length, pageMetadataAvailable: false });
  } catch (error) {
    if (documentId) await getServerSupabase().from("rule_documents").delete().eq("id", documentId);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Rulebook embedding failed" }, { status: 500 });
  }
}
