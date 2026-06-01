import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, type Page } from "@playwright/test";

import { After, Given, Then, When } from "../support/bdd.ts";
import { fixturePlanSlug, fixtureProjectSlug } from "../support/testAssets.ts";

// Resolved from the per-worker `symbiotHome` fixture so seeding writes into the
// same isolated `~/.symbiot` the worker's viewer reads — never the real home.
const planDir = (home: string): string =>
  join(home, ".symbiot", "agents", "claude-code", "history", fixtureProjectSlug, fixturePlanSlug);
const seededVersion = 99;
const extraVersionFile = (home: string, n: number): string =>
  join(planDir(home), `${String(n).padStart(3, "0")}.md`);

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

Given("a second version of the plan exists on disk", async ({ symbiotHome }) => {
  await mkdir(planDir(symbiotHome), { recursive: true });
  await writeFile(
    extraVersionFile(symbiotHome, seededVersion),
    "# Example plan with every supported markdown element\n\nRevision two.\n"
  );
});

After(async ({ symbiotHome }) => {
  await rm(extraVersionFile(symbiotHome, seededVersion), { force: true });
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
  // Wait briefly for any racing /api/plan/version?n=… fetch to fire so it
  // lands in the spy log before we read it. The `?` in the predicate aligns
  // with the spy's filter (see initFetchSpy) and avoids matching the list
  // endpoint /api/plan/versions. The spy log is the deterministic check.
  await page
    .waitForResponse((res) => res.url().includes("/api/plan/version?"), { timeout: 500 })
    .catch((error: unknown) => {
      // Only swallow the wait timeout. Other failures (page crash, navigation)
      // must surface so the spy check below doesn't pass against a dead page.
      if (!(error instanceof Error) || error.name !== "TimeoutError") throw error;
    });
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
