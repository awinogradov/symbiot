/**
 * Step definitions asserting the presence or absence of an annotation
 * highlight in the review editor.
 *
 * The editor authors annotations with an eager "Pattern A" flow: clicking a
 * selection-toolbar button colorizes the selected text immediately, before the
 * composer collects a body. These steps verify that highlight is rendered
 * after the button click and removed after the composer is cancelled. The mark
 * renders via the per-kind `text-anno-<kind>` Tailwind class on the leaf
 * element (comment/replacement → `<mark>`, insertion → `<ins>`), so the class —
 * not the tag — is the stable selector.
 *
 * @example
 *   Then the "comment" highlight is visible in the editor
 *   Then the "insertion" highlight is absent from the editor
 */
import { expect, type Locator, type Page } from "@playwright/test";

import { Then } from "../support/bdd.ts";

/** Maps a selection-toolbar annotation kind to the Tailwind class its leaf renders with. */
const annoClassByKind: Record<string, string> = {
  comment: "text-anno-comment",
  insertion: "text-anno-insert",
  replacement: "text-anno-replace",
};

/** Resolve the editor-scoped locator for a kind's highlight, failing loudly on an unknown kind. */
const highlightLocator = (page: Page, kind: string): Locator => {
  const className = annoClassByKind[kind];
  if (className === undefined) {
    throw new Error(
      `Unknown annotation kind "${kind}" — expected one of ${Object.keys(annoClassByKind).join(", ")}`
    );
  }
  return page.getByTestId("editor-root").locator(`.${className}`);
};

Then("the {string} highlight is visible in the editor", async ({ page }, kind: string) => {
  await expect(highlightLocator(page, kind).first()).toBeVisible();
});

Then("the {string} highlight is absent from the editor", async ({ page }, kind: string) => {
  await expect(highlightLocator(page, kind)).toHaveCount(0);
});
