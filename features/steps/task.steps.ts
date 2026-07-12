import { expect } from "@playwright/test";

import { Given, Then } from "../support/bdd.ts";

/**
 * A draft exactly as an older build persisted it: the reviewer had ticked the
 * "Open task" checkbox and un-ticked "Completed task", so `applyTaskToggle`
 * flipped each `checked`, snapshotted the pre-toggle state in `taskOriginal`,
 * and tagged the item's text with the `task` / `task_<id>` marks the annotation
 * walker reads. The checkbox is gone, but this shape is frozen on disk for
 * anyone who used it — the viewer still has to surface both toggles and let the
 * reviewer clear them. One toggle in each direction, so the sidebar's
 * "Mark as done" and "Mark as not done" projections are both exercised.
 */
const legacyDraft = {
  value: [
    { type: "h1", children: [{ text: "Task list" }] },
    {
      type: "p",
      listStyleType: "todo",
      indent: 1,
      checked: true,
      taskOriginal: false,
      children: [{ text: "Open task", task: true, task_legacy1: true }],
    },
    {
      type: "p",
      listStyleType: "todo",
      indent: 1,
      checked: false,
      taskOriginal: true,
      children: [{ text: "Completed task", task: true, task_legacy2: true }],
    },
  ],
  commentBodies: {},
  globalComments: [],
  updatedAt: 1_700_000_000_000,
};

/**
 * Served from a route intercept rather than POSTed to the viewer: the annotate
 * viewer is worker-scoped and its draft lives on disk, so a real POST would leak
 * this document into every annotate scenario that runs after it in the same
 * worker. Mirrors the interception in `draft.steps.ts`.
 */
Given("a draft persisted by an older build carries a task toggle", async ({ page }) => {
  await page.route("**/api/draft", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(legacyDraft),
      });
      return;
    }
    // Swallow the autosave POST the removal triggers — keeps the run hermetic.
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
});

Then("the annotation sidebar shows a task entry {string}", async ({ page }, body: string) => {
  await expect(
    page.locator('[data-testid^="sidebar-entry-"][data-kind="task"]', { hasText: body })
  ).toHaveCount(1);
});

Then("the task item {string} is struck through", async ({ page }, text: string) => {
  await expect(
    page.locator('[data-testid="editor-list"][data-checked="true"]', { hasText: text })
  ).toHaveCount(1);
});

Then("the task item {string} is not struck through", async ({ page }, text: string) => {
  await expect(
    page.locator('[data-testid="editor-list"][data-checked="false"]', { hasText: text })
  ).toHaveCount(1);
});
