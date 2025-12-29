import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

type LLMModel = "gpt-4o" | "gpt-4o-mini" | "gpt-4-turbo";

const DEFAULT_MODEL: LLMModel = "gpt-4o-mini";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
}

export async function llmChat(
  messages: ChatMessage[], 
  model: LLMModel = DEFAULT_MODEL,
  options: LLMOptions = {}
) {
  const { temperature = 0.7, maxTokens } = options;
  
  const completion = await client.chat.completions.create({
    model,
    messages,
    temperature,
    ...(maxTokens && { max_tokens: maxTokens })
  });
  return completion.choices[0]?.message?.content ?? "";
}
