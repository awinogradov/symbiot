/**
 * Step definitions for the axe-core baseline scan (`features/a11y/a11y-baseline.feature`).
 *
 * Two new steps:
 * - `Given I have at least one annotation persisted` — drops a comment so the
 *   sidebar list is non-empty before the scan exercises the sidebar's open state.
 * - `Then the page has no Critical or Serious WCAG AA violations` — instantiates
 *   AxeBuilder, scans against WCAG 2.0/2.1 A + AA tags, asserts zero
 *   Critical/Serious findings. Minor/Moderate are recorded but non-blocking.
 *
 * @example
 *   Scenario: the viewer shell has no Critical or Serious WCAG AA violations
 *     Given I open the viewer
 *     Then the page has no Critical or Serious WCAG AA violations
 *
 * @see ../a11y/a11y-baseline.feature
 * @see ../../docs/a11y.md
 */
import AxeBuilder from "@axe-core/playwright";
import { expect } from "@playwright/test";

import { Given, Then } from "../support/bdd.ts";

type AxeViolation = Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"][number];

const annotationFixtureText = "quick brown fox";
const annotationFixtureBody = "a11y baseline";

// eslint-disable-next-line complexity -- runs in browser context, must be self-contained for page.evaluate
const browserSelect = (text: string): void => {
  const root = document.querySelector('[data-testid="editor-root"]');
  if (root === null) throw new Error("editor-root not found");
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let hit: { node: Text; offset: number } | null = null;
  let node = walker.nextNode();
  while (node !== null && hit === null) {
    const offset = (node.textContent ?? "").indexOf(text);
    if (offset >= 0) hit = { node: node as Text, offset };
    node = walker.nextNode();
  }
  if (hit === null) throw new Error(`Text "${text}" not found in editor`);
  const range = document.createRange();
  range.setStart(hit.node, hit.offset);
  range.setEnd(hit.node, hit.offset + text.length);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
};

const formatViolations = (violations: AxeViolation[]): string =>
  violations.length === 0
    ? "no violations"
    : violations.map((v) => `${v.id} (${v.impact}): ${v.help}`).join("\n");

Given("I have at least one annotation persisted", async ({ page }) => {
  await page.evaluate(browserSelect, annotationFixtureText);
  await page.getByTestId("toolbar-comment").waitFor({ state: "visible" });
  // Match selection.steps.ts: let Plate's batched selection observer settle
  // before the next click so editor.selection points at the new range.
  await page.waitForTimeout(50);
  await page.getByTestId("toolbar-comment").click();
  await page.getByTestId("annotation-composer").waitFor({ state: "visible" });
  await page.getByTestId("composer-textarea").fill(annotationFixtureBody);
  await page.getByTestId("composer-textarea").press("Enter");
  await page.locator('[data-testid^="sidebar-entry-"]').first().waitFor({ state: "visible" });
});

Then("the page has no Critical or Serious WCAG AA violations", async ({ page, $testInfo }) => {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious"
  );
  if (blocking.length > 0) {
    await $testInfo.attach("axe-results", {
      body: JSON.stringify(results, null, 2),
      contentType: "application/json",
    });
  }
  expect(blocking, formatViolations(blocking)).toEqual([]);
});
