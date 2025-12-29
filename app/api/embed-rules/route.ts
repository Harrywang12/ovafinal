import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabase";
import { chunkText } from "../../../lib/rag";
import { embedChunks } from "../../../lib/embeddings";
import { assertEnv } from "../../../lib/utils";
import pdf from "pdf-parse";

export const runtime = "nodejs";

export async function POST(request: Request) {
  assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY", "OPENAI_API_KEY"]);
  const supabase = getServerSupabase();
  const { path } = await request.json();
  if (!path) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }

  const { data, error } = await supabase.storage.from("rules").download(path);
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Download failed" }, { status: 500 });
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  const pdfData = await pdf(buffer);
  const text = pdfData.text;
  const chunks = chunkText(text);
  const embeddings = await embedChunks(chunks);

  const payload = chunks.map((chunk, idx) => ({
    chunk,
    embedding: embeddings[idx]
  }));

  const { error: insertError } = await supabase.from("rules_embeddings").insert(payload);
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ inserted: payload.length });
}
