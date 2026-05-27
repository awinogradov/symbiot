import { expect } from "@playwright/test";

import { Given, Then, When } from "../support/bdd.ts";

const badge = (page: import("@playwright/test").Page): ReturnType<typeof page.getByTestId> =>
  page.getByTestId("debug-bar-badge");

Then("the debug bar badge is visible", async ({ page }) => {
  await expect(badge(page)).toBeVisible();
});

When("I click the debug bar badge", async ({ page }) => {
  await badge(page).click();
});

Then("the debug bar badge announces {string}", async ({ page }, state: string) => {
  await expect(badge(page)).toHaveAttribute("data-testid-state", state);
});

Then("the badge aria-label confirms the copy", async ({ page }) => {
  await expect(badge(page)).toHaveAttribute("aria-label", "Full SHA copied to clipboard");
});

When("I wait for the debug bar badge to return to idle", async ({ page }) => {
  await expect(badge(page)).toHaveAttribute("data-testid-state", "idle", { timeout: 3000 });
});

Given("the clipboard rejects writes", async ({ page }) => {
  // Stub navigator.clipboard.writeText so it rejects, exercising the failure
  // path in DebugBar.onCopy. Wrap in an IIFE so the override applies before
  // any click handler runs.
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: (): Promise<void> => Promise.reject(new Error("denied")),
        readText: (): Promise<string> => Promise.resolve(""),
      },
    });
  });
});

Given("the clipboard is unavailable", async ({ page }) => {
  // Force `navigator.clipboard` to be undefined so DebugBar.onCopy hits the
  // synchronous fallback branch (no Promise chain).
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
  });
});

When("I click the debug bar badge again", async ({ page }) => {
  await badge(page).click();
});
