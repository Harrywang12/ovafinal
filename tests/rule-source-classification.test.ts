import { describe, expect, it } from "vitest";
import { classifyRuleChunk, containsRallyballContent } from "../lib/rule-source-classification";

describe("rule source classification", () => {
  it("classifies the reported three-rally source as Rallyball", () => {
    const text = "Three rallies: service, tossed ball 1, tossed ball 2. The service rotates after each three-ball sequence. The Tosser calls Free Ball.";
    expect(classifyRuleChunk(text, "indoor")).toBe("rallyball_unspecified");
    expect(containsRallyballContent(text)).toBe(true);
  });

  it("keeps ordinary Indoor rules in the standard ruleset", () => {
    expect(classifyRuleChunk("The server contacts the ball after the first referee authorizes service.", "indoor")).toBe("standard_indoor");
  });

  it("classifies every Beach chunk as Beach", () => {
    expect(classifyRuleChunk("A block contact counts as a team hit.", "beach")).toBe("beach");
  });
});
