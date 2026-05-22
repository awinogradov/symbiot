import { expect } from "@playwright/test";

import { Then, When } from "../support/bdd.ts";

When("I press {string} anywhere outside the editor", async ({ page }, combo: string) => {
  await page.getByTestId("top-bar").click();
  await page.keyboard.press(toPlaywrightKey(combo));
});

When("I move focus to the global composer Cancel button", async ({ page }) => {
  await page.getByTestId("global-composer-cancel").focus();
});

When("I press {string} in the global comment composer", async ({ page }, combo: string) => {
  await page.keyboard.press(toPlaywrightKey(combo));
});

Then("the global comment composer is visible in the viewport", async ({ page }) => {
  await expect(page.getByTestId("global-composer-textarea")).toBeVisible();
});

/**
 * Translate human shortcut strings ("c", "Mod+Enter") into Playwright's key
 * descriptor format. Playwright understands `ControlOrMeta` as the
 * cross-platform Mod key.
 */
const toPlaywrightKey = (combo: string): string =>
  combo
    .split("+")
    .map((p) => {
      const key = p.trim();
      if (/^mod$/i.test(key)) return "ControlOrMeta";
      if (key.length === 1) return key.toUpperCase();
      return key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
    })
    .join("+");
