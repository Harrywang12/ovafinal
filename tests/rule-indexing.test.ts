import { describe, expect, it } from "vitest";
import { buildRuleIndexChunks, topicTagsForRule } from "../lib/rule-indexing";

describe("rule-aware source indexing", () => {
  it("extracts numbered Indoor sections with topic and rule metadata", () => {
    const chunks = buildRuleIndexChunks([{
      pageNumber: 30,
      text: `12. SERVICE\n12.1 FIRST SERVICE IN A SET\nThe first service of the first set is executed by the team determined by the toss.\n12.4 EXECUTION OF THE SERVICE\nThe ball shall be hit with one hand or any part of the arm after being tossed or released from the hand.`,
    }], "indoor");
    expect(chunks).not.toHaveLength(0);
    expect(chunks[0]).toMatchObject({ ruleset: "standard_indoor", ruleNumber: "12", topic: "service_and_service_order", pageNumber: 30 });
    expect(chunks[0].topicTags).toContain("service_and_service_order");
  });

  it("keeps Beach sources in the Beach ruleset", () => {
    const chunks = buildRuleIndexChunks([{
      pageNumber: 20,
      text: `8 STATES OF PLAY\n8.1 BALL IN PLAY\nThe ball is in play from the moment of the hit of the service authorized by the first referee.\n8.2 BALL OUT OF PLAY\nThe ball is out of play at the moment of the fault whistled by one of the referees.`,
    }], "beach");
    expect(chunks[0]).toMatchObject({ ruleset: "beach", topic: "playing_actions" });
  });

  it("separates 4v4 and 6v6 Rallyball appendix material from standard Indoor rules", () => {
    const chunks = buildRuleIndexChunks([
      { pageNumber: 48, text: "4 v 4 Volleyball: Teams rotate after service. Tripleball is used to increase rallies and player participation." },
      { pageNumber: 49, text: "6 v 6 Tripleball: Requests for substitution can occur only between a three-ball sequence. Tripleball Sequence: service, tossed ball one, tossed ball two." },
    ], "indoor");
    expect(chunks.map((chunk) => chunk.ruleset)).toContain("rallyball_4v4");
    expect(chunks.map((chunk) => chunk.ruleset)).toContain("rallyball_6v6");
    expect(chunks.some((chunk) => chunk.ruleset === "standard_indoor")).toBe(false);
  });

  it("assigns Level 2 officiating topic aliases without duplicating chunks", () => {
    expect(topicTagsForRule("23.2", "indoor", "standard_indoor", "First referee authority")).toEqual(expect.arrayContaining([
      "first_referee_authority", "crew_cooperation", "match_management",
    ]));
    expect(topicTagsForRule("23.2", "beach", "beach", "Second referee responsibility")).toContain("second_referee_responsibilities");
  });
});
