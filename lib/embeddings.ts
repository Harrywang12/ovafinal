import { createGoogle, type GoogleEmbeddingModelOptions } from "@ai-sdk/google";
import { embed, embedMany } from "ai";

const google = createGoogle({ apiKey: process.env.GEMINI_API_KEY });

export const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 1536;

export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: google.embedding(EMBEDDING_MODEL),
    value: text.replace(/\n/g, " "),
    providerOptions: {
      google: {
        outputDimensionality: EMBEDDING_DIMENSIONS,
        taskType: "RETRIEVAL_QUERY",
      } satisfies GoogleEmbeddingModelOptions,
    },
  });
  return embedding;
}

export async function embedChunks(chunks: string[]) {
  const { embeddings } = await embedMany({
    model: google.embedding(EMBEDDING_MODEL),
    values: chunks.map((chunk) => chunk.replace(/\n/g, " ")),
    providerOptions: {
      google: {
        outputDimensionality: EMBEDDING_DIMENSIONS,
        taskType: "RETRIEVAL_DOCUMENT",
      } satisfies GoogleEmbeddingModelOptions,
    },
  });
  return embeddings;
}
