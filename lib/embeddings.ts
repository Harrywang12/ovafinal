import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export const EMBEDDING_MODEL = "text-embedding-3-small";

export async function embedText(text: string): Promise<number[]> {
  const sanitized = text.replace(/\n/g, " ");
  const res = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: sanitized
  });
  return res.data[0].embedding;
}

export async function embedChunks(chunks: string[]) {
  const res = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: chunks.map((c) => c.replace(/\n/g, " "))
  });
  return res.data.map((d) => d.embedding);
}
