import { mkdir, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import { expect } from "@playwright/test";

import { After, Given, Then, When } from "../support/bdd.ts";
import { fixturePlanSlug, fixtureProjectSlug } from "../support/testAssets.ts";

const planDir = join(homedir(), ".symbiot", "history", fixtureProjectSlug, fixturePlanSlug);
const seededVersion = 99;
const extraVersionFile = (n: number): string => join(planDir, `${String(n).padStart(3, "0")}.md`);

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

Given("localStorage diff mode is set to {string}", async ({ page }, mode: string) => {
  // Set the persisted diff-mode key BEFORE the viewer's first render so
  // useVersionState's `readDiffMode` hits the "raw" branch on init.
  await page.addInitScript((value: string) => {
    window.localStorage.setItem("symbiot.diffMode", value);
  }, mode);
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
