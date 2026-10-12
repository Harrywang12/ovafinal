import { describe, expect, it } from "vitest";
import { leaderboardName, parseUsername } from "../lib/usernames";

describe("usernames", () => {
  it("accepts 3-20 letters, numbers, and underscores", () => {
    expect(parseUsername("  court_vision9 ")).toBe("court_vision9");
    expect(parseUsername("ab")).toBeNull();
    expect(parseUsername("a".repeat(21))).toBeNull();
    expect(parseUsername("no spaces")).toBeNull();
    expect(parseUsername("<script>")).toBeNull();
    expect(parseUsername(undefined)).toBeNull();
  });

  it("falls back to an anonymous label without exposing the full user id", () => {
    expect(leaderboardName("court_vision", "11111111-1111-4111-8111-111111111abc")).toBe("court_vision");
    const label = leaderboardName(null, "11111111-1111-4111-8111-111111111abc");
    expect(label).toBe("Referee #1abc");
    expect(label).not.toContain("11111111");
  });
});
