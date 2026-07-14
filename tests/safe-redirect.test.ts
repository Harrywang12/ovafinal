import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "../lib/safe-redirect";

describe("safeRedirectPath", () => {
  it("preserves local destinations with query strings", () => {
    expect(safeRedirectPath("/quiz?mode=assigned")).toBe("/quiz?mode=assigned");
  });

  it.each([
    "https://attacker.example/path",
    "//attacker.example/path",
    "javascript:alert(1)",
    "/dashboard\nSet-Cookie:test=1",
    "/login",
    "/auth/callback?next=/dashboard",
  ])("rejects unsafe or looping destination %s", (value) => {
    expect(safeRedirectPath(value)).toBe("/dashboard");
  });
});
