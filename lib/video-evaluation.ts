import { searchRules } from "./rag";
import { formatRuleContext } from "./utils";
import { llmChat } from "./llm";

export interface VideoEvaluationResult {
  is_correct: boolean;
  normalized_call: string;
  explanation: string;
  rule_reference: string;
}

const MAX_RETRIES = 2;

/**
 * Evaluates a user's ruling on a video clip using RAG-retrieved official rules.
 * 
 * CRITICAL: The RAG query uses `correctCall`, NOT `userAnswer`, to ensure
 * we retrieve authoritative rule context rather than user interpretations.
 * 
 * @param userAnswer - The user's submitted ruling text
 * @param correctCall - The correct/expected ruling for the video
 * @param difficulty - Difficulty level of the video (for context)
 * @returns Evaluation result with correctness, explanation, and rule citation
 */
export async function evaluateVideoRuling(
  userAnswer: string,
  correctCall: string,
  difficulty: string
): Promise<VideoEvaluationResult> {
  // Retrieve authoritative rule context using the correct call
  const chunks = await searchRules(correctCall, 4);
  const context = formatRuleContext(chunks);

  // Check if we have sufficient context
  const hasContext = chunks.length > 0 && context.trim().length > 0;

  const systemPrompt = `You are a volleyball officiating evaluator. Your task is to determine whether a user's ruling on a video clip is correct according to official volleyball rules.

CRITICAL REQUIREMENTS:
1. Use ONLY the provided rule snippets as ground truth - never invent or assume rules
2. Compare the user's answer against the correct call
3. Clearly state whether the ruling is correct or incorrect
4. Cite an official rule number (e.g., "Rule 11.2.1") from the provided context
5. If the rule context is insufficient or ambiguous, return is_correct: false and explicitly state uncertainty in the explanation

You MUST respond with ONLY valid JSON in this exact format (no markdown, no code blocks, no additional text):
{
  "is_correct": boolean,
  "normalized_call": string,
  "explanation": string,
  "rule_reference": string
}

The normalized_call should be a standardized version of what the user intended (e.g., if they said "net touch" and meant "net contact", normalize to the official terminology).`;

  const userPrompt = `Evaluate the following ruling:

User's Answer: "${userAnswer}"
Correct Call: "${correctCall}"
Difficulty: ${difficulty}

${hasContext ? `Official Rule Context:\n${context}` : "WARNING: No rule context available. The ruling cannot be properly evaluated."}

Determine if the user's answer is correct. Consider:
- Semantic equivalence (e.g., "net touch" vs "net contact" vs "net violation")
- Completeness (did they identify all relevant violations?)
- Accuracy (is their understanding of the rule correct?)

${!hasContext ? "Since no rule context is available, return is_correct: false and explain that the evaluation cannot be completed due to insufficient rule information." : ""}

Respond with ONLY the JSON object, no additional text.`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await llmChat(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        "gpt-4o-mini",
        { temperature: 0.3, maxTokens: 500 } // Lower temperature for more consistent evaluation
      );

      // Clean the response - remove markdown code blocks if present
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith("```json")) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanedResponse.startsWith("```")) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      const parsed = JSON.parse(cleanedResponse) as VideoEvaluationResult;

      // Validate required fields
      if (
        typeof parsed.is_correct !== "boolean" ||
        typeof parsed.normalized_call !== "string" ||
        typeof parsed.explanation !== "string" ||
        typeof parsed.rule_reference !== "string"
      ) {
        throw new Error("Invalid JSON structure: missing or incorrect field types");
      }

      // If no context was available, ensure we mark as incorrect
      if (!hasContext && parsed.is_correct) {
        parsed.is_correct = false;
        parsed.explanation = `Unable to evaluate: insufficient rule context available. ${parsed.explanation}`;
      }

      return parsed;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // If this was the last attempt, handle gracefully
      if (attempt === MAX_RETRIES) {
        // Return a safe fallback response
        return {
          is_correct: false,
          normalized_call: userAnswer.trim(),
          explanation: `Evaluation failed due to technical error. Please try again. If the problem persists, the ruling may need manual review.`,
          rule_reference: "Evaluation unavailable"
        };
      }
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error("Failed to evaluate ruling after retries");
}

