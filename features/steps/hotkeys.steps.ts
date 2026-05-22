import { expect } from "@playwright/test";

import { Then, When } from "../support/bdd.ts";

When("I press {string} anywhere outside the editor", async ({ page }, combo: string) => {
  // Wait until Plate has finished constructing the editor. Reaching this
  // state means useReadyHandle has fired and the editor handle is registered;
  // without it, c/i/r/d would route through a null handle. Plate stamps
  // `data-slate-node="element"` on every block.
  await page
    .locator('[data-testid="editor-root"] [data-slate-node="element"]')
    .first()
    .waitFor({ state: "visible" });
  // Do NOT click outside the editor first — that collapses the DOM text
  // selection that c/i/r/d depend on. useHotkeys binds at the document
  // level, so a bare keyboard press fires regardless of where focus is.
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
