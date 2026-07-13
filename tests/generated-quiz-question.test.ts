import { describe, expect, it } from "vitest";
import { generatedQuizQuestionSchema, validateGeneratedQuestion } from "../lib/generated-quiz-question";

const chunk = {
  id: "11111111-1111-4111-8111-111111111111",
  document_id: "22222222-2222-4222-8222-222222222222",
  ruleset: "beach" as const,
  chunk_text: "Rule 12.4 requires the server to contact the ball within the permitted service time.",
};

const valid = {
  question: "The referee authorizes service. What must the server do?",
  options: ["Serve within the permitted time", "Request a substitution", "Change court", "Contact the net"],
  answer: "Serve within the permitted time",
  explanation: "The service must occur within the permitted service time.",
  ruleReference: "Rule 12.4 - Execution of service",
  discipline: "beach",
  refereeLevel: "level_1",
  difficulty: "basic",
  topic: "service_and_service_order",
  subtopic: "service_execution",
  ruleId: "12.4",
  scenarioType: "basic_service_procedure",
  refereeRole: "first_referee",
  decisionType: "service_fault",
  sourceDocumentId: chunk.document_id,
  sourceChunkIds: [chunk.id],
  sourceExcerpt: "the server to contact the ball within the permitted service time",
};

describe("generated quiz question validation", () => {
  it("accepts a fully grounded question", () => {
    expect(validateGeneratedQuestion(valid, { discipline: "beach", refereeLevel: "level_1", difficulty: "basic" }, [chunk])).toMatchObject(valid);
  });

  it("rejects an answer that does not exactly match an option", () => {
    expect(() => generatedQuizQuestionSchema.parse({ ...valid, answer: "Option A" })).toThrow(/exactly match/i);
  });

  it("rejects duplicate options", () => {
    expect(() => generatedQuizQuestionSchema.parse({ ...valid, options: [valid.options[0], valid.options[0], valid.options[2], valid.options[3]] })).toThrow(/unique/i);
  });

  it("rejects discipline and referee-level mismatches", () => {
    expect(() => validateGeneratedQuestion(valid, { discipline: "indoor", refereeLevel: "level_1", difficulty: "basic" }, [chunk])).toThrow(/discipline/i);
    expect(() => validateGeneratedQuestion(valid, { discipline: "beach", refereeLevel: "level_2", difficulty: "basic" }, [chunk])).toThrow(/level/i);
  });

  it("rejects source excerpts and IDs outside retrieved context", () => {
    expect(() => validateGeneratedQuestion({ ...valid, sourceExcerpt: "This sentence does not occur in the source context." }, { discipline: "beach", refereeLevel: "level_1", difficulty: "basic" }, [chunk])).toThrow(/excerpt/i);
    expect(() => validateGeneratedQuestion({ ...valid, sourceChunkIds: ["33333333-3333-4333-8333-333333333333"] }, { discipline: "beach", refereeLevel: "level_1", difficulty: "basic" }, [chunk])).toThrow(/unretrieved/i);
  });

  it("rejects Rallyball wording from a standard Indoor question", () => {
    const indoorChunk = {
      ...chunk,
      ruleset: "standard_indoor" as const,
      chunk_text: "A team rotates before serving when it has gained the right to serve.",
    };
    const indoorQuestion = {
      ...valid,
      discipline: "indoor",
      question: "After a three-ball sequence, which player serves next?",
      answer: "Serve within the permitted time",
      explanation: "The player must serve within the permitted sequence.",
      sourceExcerpt: "A team rotates before serving when it has gained the right to serve.",
    };
    expect(() => validateGeneratedQuestion(
      indoorQuestion,
      { discipline: "indoor", refereeLevel: "level_1", difficulty: "basic" },
      [indoorChunk]
    )).toThrow(/Rallyball|Tripleball/i);
  });
});
