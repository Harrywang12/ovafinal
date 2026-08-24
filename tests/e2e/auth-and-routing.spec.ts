import { expect, test, type Page } from "@playwright/test";

async function waitForHydration(page: Page) {
  await page.locator("html[data-hydrated='true']").waitFor();
}

test("sanitizes unsafe post-login destinations", async ({ page }) => {
  await page.goto("/login?next=//attacker.example");
  await waitForHydration(page);
  await expect(page.getByRole("heading", { name: "Sign in to continue" })).toBeVisible();
  await expect(page.getByText(/After signing in/)).toContainText("/dashboard");
});

test("exposes an accessible sign-in and sign-up flow", async ({ page }) => {
  await page.goto("/login");
  await waitForHydration(page);
  await expect(page.getByLabel("Email Address")).toHaveAttribute("autocomplete", "email");
  await expect(page.getByLabel("Password")).toHaveAttribute("autocomplete", "current-password");
  await page.getByRole("button", { name: "Sign Up" }).click();
  await expect(page.getByLabel("Confirm Password")).toHaveAttribute("autocomplete", "new-password");
  await expect(page.getByLabel("Referee Level")).toBeVisible();
});

test("provides password recovery without exposing account existence", async ({ page }) => {
  await page.route("**/auth/v1/recover*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await page.goto("/forgot-password");
  await waitForHydration(page);
  await page.getByLabel("Email address").fill("someone@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText("Check your inbox");
  await expect(page.getByRole("button", { name: /Send another link in (?:1:00|0:5\d)/ })).toBeDisabled();

  await page.goto("/login");
  await page.goto("/forgot-password");
  await waitForHydration(page);
  await expect(page.getByRole("button", { name: /Send another link in (?:1:00|0:5\d)/ })).toBeDisabled();
});

test("redirects anonymous users away from protected pages", async ({ page }) => {
  const response = await page.goto("/dashboard");
  await waitForHydration(page);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/login\?next=(?:%2F|\/)dashboard$/);
});

test("honors reduced motion preferences", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/forgot-password");
  await waitForHydration(page);
  await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
  const animationDuration = await page.locator("body").evaluate(() => getComputedStyle(document.body).animationDuration);
  expect(["0s", "0.01ms", "1e-05s"]).toContain(animationDuration);
});
