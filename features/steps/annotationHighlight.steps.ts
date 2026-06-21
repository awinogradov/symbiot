/**
 * Step definitions asserting the presence or absence of an annotation
 * highlight in the review editor.
 *
 * The editor authors annotations with an eager "Pattern A" flow: clicking a
 * selection-toolbar button colorizes the selected text immediately, before the
 * composer collects a body. These steps verify that highlight is rendered
 * after the button click and removed after the composer is cancelled. Each
 * annotation leaf carries a per-kind `data-testid` (`annotation-<kind>`), the
 * stable selector the suite mandates over class/role selectors.
 *
 * @example
 *   Then the "comment" highlight is visible in the editor
 *   Then the "insertion" highlight is absent from the editor
 */
import { expect, type Locator, type Page } from "@playwright/test";

import { Then } from "../support/bdd.ts";

/** Maps a selection-toolbar annotation kind to the `data-testid` its leaf renders with. */
const highlightTestIdByKind: Record<string, string> = {
  comment: "annotation-comment",
  insertion: "annotation-insertion",
  replacement: "annotation-replacement",
};

/** Resolve the editor-scoped locator for a kind's highlight, failing loudly on an unknown kind. */
const highlightLocator = (page: Page, kind: string): Locator => {
  const testId = highlightTestIdByKind[kind];
  if (testId === undefined) {
    throw new Error(
      `Unknown annotation kind "${kind}" — expected one of ${Object.keys(highlightTestIdByKind).join(", ")}`
    );
  }
  return page.getByTestId("editor-root").getByTestId(testId);
};

Then("the {string} highlight is visible in the editor", async ({ page }, kind: string) => {
  await expect(highlightLocator(page, kind).first()).toBeVisible();
});

Then("the {string} highlight is absent from the editor", async ({ page }, kind: string) => {
  try {
    await expect(highlightLocator(page, kind)).toHaveCount(0);
  } catch (error) {
    // Temporary diagnostic (symbiot#231): dump the editor's per-cancel record so a flaky
    // failure shows whether the model was cleaned and what the DOM held. Revert with the
    // editor-side instrumentation once the mechanism is confirmed.
    const diag = await page.evaluate(() =>
      JSON.stringify((window as unknown as { __diag?: unknown[] }).__diag ?? null)
    );
    throw new Error(`[symbiot#231] highlight not absent. __diag=${diag}`, { cause: error });
  }
});
