import { mkdir, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import { expect, type Page } from "@playwright/test";

import { After, Given, Then, When } from "../support/bdd.ts";
import { fixturePlanSlug, fixtureProjectSlug } from "../support/testAssets.ts";

const planDir = join(homedir(), ".symbiot", "history", fixtureProjectSlug, fixturePlanSlug);
const seededVersion = 99;
const extraVersionFile = (n: number): string => join(planDir, `${String(n).padStart(3, "0")}.md`);

/**
 * Per-page request log. Keyed by Page so each scenario's spies stay isolated.
 * WeakMap entries vanish when Playwright tears the page down.
 */
const versionFetchesByPage = new WeakMap<Page, string[]>();

const initFetchSpy = async (page: Page): Promise<void> => {
  const log: string[] = [];
  versionFetchesByPage.set(page, log);
  page.on("request", (req) => {
    if (req.url().includes("/api/plan/version?")) log.push(req.url());
  });
};

Given("a second version of the plan exists on disk", async () => {
  await mkdir(planDir, { recursive: true });
  await writeFile(
    extraVersionFile(seededVersion),
    "# Example plan with every supported markdown element\n\nRevision two.\n"
  );
});

After(async () => {
  await rm(extraVersionFile(seededVersion), { force: true });
});

Then("the sidebar history tab is visible", async ({ page }) => {
  await page.getByTestId("sidebar-tab-history").waitFor({ state: "visible" });
});

When("I click the sidebar history tab", async ({ page }) => {
  await page.getByTestId("sidebar-tab-history").click();
});

Then("the version browser is visible", async ({ page }) => {
  await page.getByTestId("version-browser").waitFor({ state: "visible" });
});

When("I click the current version row", async ({ page }) => {
  await page.locator('[data-testid^="version-row-"][data-active="true"]').first().click();
});

Given("I am spying on plan-version requests", async ({ page }) => {
  await initFetchSpy(page);
});

Then("no plan-version fetch was triggered", async ({ page }) => {
  // Race a bounded waitForResponse against the click's potential fetch.
  // If a /api/plan/version request fires, the wait resolves and the assertion
  // fails. If no request fires, the wait times out and the spy stays empty.
  // The 500ms bound is event-driven with a fallback, not a wall-clock sleep.
  const racing = page
    .waitForResponse((res) => res.url().includes("/api/plan/version"), { timeout: 500 })
    .then(() => true)
    .catch(() => false);
  expect(await racing).toBe(false);
  expect(versionFetchesByPage.get(page) ?? []).toEqual([]);
});

Given("localStorage diff mode is set to {string}", async ({ page }, value: string) => {
  // Seed the persisted diff-mode key BEFORE the viewer's first render so
  // useVersionState's `readDiffMode` reads it on init.
  await page.addInitScript((v: string) => {
    window.localStorage.setItem("symbiot.diffMode", v);
  }, value);
});

Then("the current version row is marked active", async ({ page }) => {
  const activeRows = page.locator('[data-testid^="version-row-"][data-active="true"]');
  await expect(activeRows).toHaveCount(1);
  const active = activeRows.first();
  // "current" is rendered only on the active row by VersionBrowser, so the
  // combination of `data-active="true"` and the "current" label proves both
  // that exactly one row is active and that it is the row marked as current.
  await expect(active).toContainText("current");
  await expect(active).toContainText(/^Version \d{3}/);
});
