import { NextResponse } from "next/server";
import { searchRules } from "../../../lib/rag";
import { llmChat } from "../../../lib/llm";
import { assertEnv, formatRuleContext } from "../../../lib/utils";

export const runtime = "nodejs";

// Topic categories for varied question generation
const REFEREE_TOPICS = [
  // Faults and Violations
  "volleyball double contact fault hand signal",
  "volleyball four hits fault team violation",
  "volleyball net touch fault player contact rules",
  "volleyball foot fault service line violation",
  "volleyball back row attack rules fault",
  "volleyball lift carry fault ball handling",
  "volleyball rotation fault positional error",
  "volleyball center line foot crossing violation",
  "volleyball attack hit blocking fault",
  "volleyball ball handling judgment double hit",
  
  // Service Rules
  "volleyball service rules order procedures",
  "volleyball service fault toss eight seconds",
  "volleyball let serve net service rules",
  "volleyball service screen illegal formation",
  "volleyball serving order rotation violation",
  
  // Blocking and Attack
  "volleyball blocking rules back row player",
  "volleyball simultaneous contact block attack",
  "volleyball attack line three meter rule",
  "volleyball joust ball simultaneous hit",
  "volleyball block touch team hits count",
  
  // Net Play
  "volleyball net contact rules interference",
  "volleyball reaching over net blocking rules",
  "volleyball penetration under net rules",
  "volleyball antenna touch ball out rules",
  
  // Positioning and Rotation
  "volleyball rotation order position fault",
  "volleyball overlap positional rules check",
  "volleyball libero replacement rules substitution",
  "volleyball libero attack restriction rules",
  "volleyball setter position overlap check",
  
  // Ball In/Out Decisions
  "volleyball ball in out line decision",
  "volleyball antenna ball contact outside",
  "volleyball ceiling contact rules play",
  "volleyball ball touching boundary lines",
  
  // Match Procedures
  "volleyball timeout rules duration procedure",
  "volleyball substitution rules procedure limits",
  "volleyball injury timeout protocol rules",
  "volleyball delay warning sanction rules",
  "volleyball coin toss first serve choice",
  
  // Scoring and Sets
  "volleyball scoring rally point system",
  "volleyball deciding set rules fifth set",
  "volleyball side switch rules procedures",
  "volleyball point award replay situations",
  
  // Misconduct and Sanctions
  "volleyball misconduct sanctions cards penalties",
  "volleyball yellow card red card rules",
  "volleyball coach conduct sideline rules",
  "volleyball expulsion disqualification rules",
  
  // Referee Signals and Procedures
  "volleyball referee hand signals official",
  "volleyball first referee second referee duties",
  "volleyball line judge signals responsibilities",
  "volleyball scoresheet recording procedures",
  
  // Complex Scenarios
  "volleyball replay situations circumstances",
  "volleyball interference external objects rules",
  "volleyball ball becomes dead situations",
  "volleyball rally interruption circumstances"
];

// Question scenario types for variety
const SCENARIO_TYPES = [
  "game situation judgment call",
  "rule interpretation edge case", 
  "referee positioning and decision",
  "hand signal identification",
  "fault recognition scenario",
  "sanction and penalty application",
  "procedural knowledge test",
  "complex multi-fault situation"
];

export async function POST(request: Request) {
  try {
    assertEnv(["OPENAI_API_KEY", "SUPABASE_SERVICE_KEY", "SUPABASE_URL"]);
  } catch (envError) {
    return NextResponse.json(
      { error: "Missing environment variables", details: (envError as Error).message },
      { status: 500 }
    );
  }

  let body: { difficulty?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { difficulty = "medium" } = body;
  const safeDifficulty = ["easy", "medium", "hard"].includes(difficulty)
    ? difficulty
    : "medium";

  // Randomly select 2-3 different topics for variety
  const shuffledTopics = [...REFEREE_TOPICS].sort(() => Math.random() - 0.5);
  const selectedTopics = shuffledTopics.slice(0, 3);
  const randomScenarioType = SCENARIO_TYPES[Math.floor(Math.random() * SCENARIO_TYPES.length)];
  
  // Gather chunks from multiple topic searches for maximum variety
  const allChunks: { chunk: string; similarity: number }[] = [];
  
  try {
    const searchPromises = selectedTopics.map(topic => searchRules(topic, 4));
    const results = await Promise.all(searchPromises);
    
    for (const chunks of results) {
      if (chunks && chunks.length > 0) {
        allChunks.push(...chunks);
      }
    }
  } catch (searchError) {
    return NextResponse.json(
      { error: "Failed to search rules", details: (searchError as Error).message },
      { status: 500 }
    );
  }

  if (allChunks.length === 0) {
    return NextResponse.json(
      { 
        error: "No rules found in database", 
        hint: "Please upload and embed the rulebook first using /api/upload-rules and /api/embed-rules" 
      },
      { status: 400 }
    );
  }

  // Deduplicate and randomly select chunks to use
  const uniqueChunks = Array.from(
    new Map(allChunks.map(c => [c.chunk.slice(0, 100), c])).values()
  );
  const shuffledChunks = uniqueChunks.sort(() => Math.random() - 0.5);
  const finalChunks = shuffledChunks.slice(0, 5);

  // Generate a unique seed for this question to encourage variety
  const randomSeed = Math.floor(Math.random() * 10000);
  const focusArea = selectedTopics[0].replace("volleyball ", "").replace(/ /g, ", ");

  const difficultyGuidelines = {
    easy: `
      - Focus on fundamental rules that every referee must know
      - Clear-cut scenarios with obvious correct answers
      - Basic terminology and common game situations
      - Examples: basic faults, simple rotation questions, common hand signals`,
    medium: `
      - Intermediate rule applications requiring good judgment
      - Scenarios with subtle distinctions between options
      - Rule interactions and timing considerations
      - Examples: back row attack nuances, block touch counting, libero restrictions`,
    hard: `
      - Complex scenarios with multiple rules interacting
      - Edge cases and unusual situations that test deep knowledge
      - Require understanding of rule priorities and exceptions
      - Examples: simultaneous faults, replay vs point decisions, sanction escalation`
  };

  const system = `You are an elite volleyball referee trainer and FIVB rules expert. Your task is to create ONE highly specific, practical quiz question that will genuinely help referees improve their officiating skills.

CRITICAL REQUIREMENTS:
1. The question MUST be based on a realistic game situation that a referee would actually encounter
2. Include specific details: player positions, game score context if relevant, exact actions
3. All 4 options must be plausible - no obviously wrong answers
4. The correct answer MUST be one of the exact option strings you provide
5. The explanation must cite the specific rule number/section from FIVB rules

QUESTION FOCUS AREA: ${focusArea}
SCENARIO TYPE: ${randomScenarioType}
DIFFICULTY: ${safeDifficulty}
${difficultyGuidelines[safeDifficulty as keyof typeof difficultyGuidelines]}

RANDOMIZATION SEED: ${randomSeed} (use this to vary your approach - different scenario angles, different team perspectives, different phases of play)

STRICT JSON FORMAT - Return ONLY valid JSON:
{
  "question": "A detailed, specific scenario question (include player positions, actions, timing)",
  "options": [
    "Option A - Complete answer text",
    "Option B - Complete answer text",
    "Option C - Complete answer text", 
    "Option D - Complete answer text"
  ],
  "answer": "Option X - Complete answer text (MUST be EXACTLY one of the options above, including the letter prefix)",
  "explanation": "Detailed explanation of why this is correct, referencing the specific rule (e.g., Rule 12.4.1)",
  "rule_reference": "Rule X.X.X - Brief rule title"
}

QUALITY CHECKLIST:
- Is this question specific enough that only one answer can be correct?
- Would a referee encounter this exact scenario in a real match?
- Does the explanation teach something valuable?
- Are the wrong options realistic mistakes a referee might make?`;

  const context = formatRuleContext(finalChunks);

  let content: string;
  try {
    content = await llmChat([
      { role: "system", content: system },
      { role: "user", content: `Based on these official volleyball rules, create a ${safeDifficulty} difficulty question:\n\n${context}\n\nRemember: Return ONLY valid JSON. The "answer" field must be the COMPLETE text of one of your options, including the letter prefix (e.g., "Option A - The correct answer text").` }
    ], "gpt-4o", { temperature: 0.85 }); // Higher temperature for more variety
  } catch (llmError) {
    return NextResponse.json(
      { error: "Failed to generate question from LLM", details: (llmError as Error).message },
      { status: 500 }
    );
  }

  try {
    // Strip markdown code fences if present
    let jsonContent = content.trim();
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent.slice(7);
    } else if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.slice(3);
    }
    if (jsonContent.endsWith("```")) {
      jsonContent = jsonContent.slice(0, -3);
    }
    jsonContent = jsonContent.trim();

    const parsed = JSON.parse(jsonContent);
    
    // Validate and normalize the response
    if (!parsed.question || !parsed.options || !parsed.answer || !parsed.explanation) {
      throw new Error("Missing required fields in response");
    }
    
    // Ensure options is an array of 4 strings
    if (!Array.isArray(parsed.options) || parsed.options.length !== 4) {
      throw new Error("Options must be an array of 4 strings");
    }
    
    // Clean up options (remove "Option A - " prefixes if present for cleaner display)
    const cleanOptions = parsed.options.map((opt: string) => {
      // Remove prefixes like "Option A - " or "A. " or "A) "
      return opt.replace(/^(Option\s+)?[A-D][\s\-\.\)]+/i, "").trim();
    });
    
    // Clean the answer the same way
    let cleanAnswer = parsed.answer.replace(/^(Option\s+)?[A-D][\s\-\.\)]+/i, "").trim();
    
    // Verify the answer matches one of the cleaned options
    if (!cleanOptions.includes(cleanAnswer)) {
      // Try to find a matching option
      const answerLower = cleanAnswer.toLowerCase();
      const matchingOption = cleanOptions.find((opt: string) => 
        opt.toLowerCase().includes(answerLower) || answerLower.includes(opt.toLowerCase())
      );
      if (matchingOption) {
        cleanAnswer = matchingOption;
      } else {
        // If still no match, use the first option as fallback (shouldn't happen with good prompting)
        console.warn("Answer didn't match options, falling back to first option");
        cleanAnswer = cleanOptions[0];
      }
    }
    
    return NextResponse.json({
      question: parsed.question,
      options: cleanOptions,
      answer: cleanAnswer,
      explanation: parsed.explanation,
      rule_reference: parsed.rule_reference || null,
      context: finalChunks
    });
  } catch (parseErr) {
    return NextResponse.json(
      { error: "Failed to parse model response as JSON", raw: content, context: finalChunks },
      { status: 500 }
    );
  }
}
