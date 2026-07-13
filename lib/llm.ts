import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output, type ModelMessage } from "ai";
import type { z } from "zod";

const directOpenAI = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

type LegacyModel = "gpt-4o" | "gpt-4o-mini" | "gpt-4-turbo";
export type LLMProfile = "fast" | "quality" | LegacyModel;

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

function profileFor(model: LLMProfile) {
  return model === "quality" || model === "gpt-4o" || model === "gpt-4-turbo" ? "quality" : "fast";
}

function modelFor(profile: LLMProfile) {
  const useGateway = Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
  const modelId = profileFor(profile) === "quality" ? "gpt-5.4" : "gpt-5.4-mini";
  return {
    model: useGateway ? `openai/${modelId}` : directOpenAI(modelId),
    useGateway,
  };
}

function callOptions(messages: ChatMessage[], profile: LLMProfile, options: LLMOptions) {
  const selected = modelFor(profile);
  const instructions = messages.filter((message) => message.role === "system").map((message) => message.content).join("\n\n");
  const modelMessages = messages.filter((message) => message.role !== "system") as ModelMessage[];
  return {
    model: selected.model,
    ...(instructions ? { instructions } : {}),
    messages: modelMessages,
    temperature: options.temperature,
    maxOutputTokens: options.maxTokens,
    timeout: options.timeoutMs,
    maxRetries: options.maxRetries ?? 0,
    ...(selected.useGateway && (options.userId || options.tags?.length)
      ? {
          providerOptions: {
            gateway: {
              ...(options.userId ? { user: options.userId } : {}),
              ...(options.tags?.length ? { tags: options.tags } : {}),
              models: ["openai/gpt-5.4-mini"],
            },
          },
        }
      : {}),
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
