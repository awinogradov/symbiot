import { stat } from "node:fs/promises";

import { expect } from "@playwright/test";

import { Then, When } from "../support/bdd.ts";

When("I press {string} anywhere outside the editor", async ({ page }, combo: string) => {
  // Wait until Plate has finished constructing the editor. Reaching this
  // state means useReadyHandle has fired and the editor handle is registered;
  // without it, c/i/r/d would route through a null handle. Paragraphs are
  // present in every fixture and ParagraphElement stamps `editor-paragraph`
  // (selectors must use `data-testid` per docs/08-testing.md § Playwright-BDD
  // selectors).
  await page.getByTestId("editor-paragraph").first().waitFor({ state: "visible" });
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

Then("the Settings menu is still visible", async ({ page }) => {
  await expect(page.getByTestId("settings-menu")).toBeVisible();
});

Then("the global comment composer is not visible", async ({ page }) => {
  await expect(page.getByTestId("global-composer-textarea")).toBeHidden();
});

Then("no plan-review decision was recorded", async ({ page, planDecisionFile }) => {
  // The viewer writes its decision to `planDecisionFile` only on
  // approve/deny/feedback. `Given I open the viewer` resets the file before
  // the scenario, so the file's absence is the deterministic signal that
  // no decision fired. Wait briefly for any racing POST to complete (so the
  // server has had a chance to write before we stat), then assert ENOENT.
  await page
    .waitForRequest(
      (req) => /\/api\/(approve|deny|feedback)$/.test(req.url()) && req.method() === "POST",
      { timeout: 500 }
    )
    .catch((error: unknown) => {
      // Only swallow the wait timeout. Other failures (page crash, navigation)
      // must surface so the file check below doesn't pass against a dead page.
      if (!(error instanceof Error) || error.name !== "TimeoutError") throw error;
    });
  await expect(stat(planDecisionFile)).rejects.toThrow(/ENOENT/);
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
