import { describe, expect, it } from "vitest";
import { safeAuthCallbackRedirectPath, safeRedirectPath } from "../lib/safe-redirect";

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

describe("safeAuthCallbackRedirectPath", () => {
  it("allows the password reset form after a successful auth exchange", () => {
    expect(safeAuthCallbackRedirectPath("/reset-password")).toBe("/reset-password");
  });

  it("still rejects other auth pages and external redirects", () => {
    expect(safeAuthCallbackRedirectPath("/login")).toBe("/dashboard");
    expect(safeAuthCallbackRedirectPath("//attacker.example/reset-password")).toBe("/dashboard");
    expect(safeAuthCallbackRedirectPath("https://attacker.example/reset-password")).toBe("/dashboard");
  });
});
