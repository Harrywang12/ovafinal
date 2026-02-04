import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabase";
import { chunkText } from "../../../lib/rag";
import { embedChunks } from "../../../lib/embeddings";
import { assertEnv } from "../../../lib/utils";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for large file processing

export async function POST(request: Request) {
  assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY", "OPENAI_API_KEY"]);
  const supabase = getServerSupabase();
  
  try {
    const { filePath, source } = await request.json();
    
    if (!filePath) {
      return NextResponse.json({ error: "filePath is required" }, { status: 400 });
    }

    // Read the text file from the public directory
    const fullPath = path.join(process.cwd(), "public", filePath);
    
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: `File not found: ${filePath}` }, { status: 404 });
    }

    const text = fs.readFileSync(fullPath, "utf-8");
    
    // Add source prefix to each chunk for better RAG context
    const sourcePrefix = source || path.basename(filePath, path.extname(filePath));
    const prefixedText = `[Source: ${sourcePrefix}]\n\n${text}`;
    
    const chunks = chunkText(prefixedText);
    console.log(`Processing ${chunks.length} chunks for ${sourcePrefix}...`);
    
    // Check if chunks from this source already exist and delete them
    const { error: deleteError } = await supabase
      .from("rules_embeddings")
      .delete()
      .like("chunk", `%[Source: ${sourcePrefix}]%`);

    if (deleteError) {
      console.warn("Could not delete existing chunks:", deleteError.message);
    }

    // Process chunks in batches to avoid timeout
    const batchSize = 10;
    let totalInserted = 0;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batchChunks = chunks.slice(i, i + batchSize);
      console.log(`Embedding batch ${Math.floor(i / batchSize) + 1} (chunks ${i + 1}-${Math.min(i + batchSize, chunks.length)})...`);
      
      const embeddings = await embedChunks(batchChunks);
      
      const payload = batchChunks.map((chunk, idx) => ({
        chunk,
        embedding: embeddings[idx]
      }));

      const { error: insertError } = await supabase.from("rules_embeddings").insert(payload);
      if (insertError) {
        return NextResponse.json({ error: `Batch insertion failed: ${insertError.message}` }, { status: 500 });
      }
      
      totalInserted += payload.length;
      console.log(`✓ Inserted ${payload.length} chunks (${totalInserted}/${chunks.length} total)`);
    }

    return NextResponse.json({ 
      inserted: totalInserted,
      source: sourcePrefix,
      message: `Successfully embedded ${totalInserted} chunks from ${filePath}`
    });
  } catch (error) {
    console.error("Error in embed-text:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    }, { status: 500 });
  }
}
