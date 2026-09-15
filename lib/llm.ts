import { createGoogle } from "@ai-sdk/google";
import { generateText, Output, type ModelMessage } from "ai";
import type { z } from "zod";

const google = createGoogle({ apiKey: process.env.GEMINI_API_KEY });

export type LLMProfile = "fast" | "quality";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  maxRetries?: number;
  jsonObject?: boolean;
  userId?: string;
  tags?: string[];
}

function modelFor(profile: LLMProfile) {
  return google(profile === "quality" ? "gemini-3.1-pro-preview" : "gemini-3.8-flash");
}

function callOptions(messages: ChatMessage[], profile: LLMProfile, options: LLMOptions) {
  const instructions = messages.filter((message) => message.role === "system").map((message) => message.content).join("\n\n");
  const modelMessages = messages.filter((message) => message.role !== "system") as ModelMessage[];
  return {
    model: modelFor(profile),
    ...(instructions ? { instructions } : {}),
    messages: modelMessages,
    temperature: options.temperature,
    maxOutputTokens: options.maxTokens,
    timeout: options.timeoutMs,
    maxRetries: options.maxRetries ?? 0,
  };
}

export async function llmChat(
  messages: ChatMessage[],
  model: LLMProfile = "fast",
  options: LLMOptions = {}
) {
  const result = await generateText({
    ...callOptions(messages, model, options),
    ...(options.jsonObject ? { output: Output.json() } : {}),
  });
  if (options.jsonObject) return JSON.stringify(result.output);
  return result.text;
}

export async function llmObject<T>(
  messages: ChatMessage[],
  schema: z.ZodType<T>,
  model: LLMProfile = "fast",
  options: LLMOptions = {}
): Promise<T> {
  const result = await generateText({
    ...callOptions(messages, model, options),
    output: Output.object({ schema }),
  });
  return result.output;
}
