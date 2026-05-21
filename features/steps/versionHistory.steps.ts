import { mkdir, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import { After, Given, Then, When } from "../support/bdd.ts";

const project = "symbiot";
const slug = "example-plan-with-every-supported-markdown-element";
const planDir = join(homedir(), ".symbiot", "history", project, slug);
const extraVersionFile = (n: number): string => join(planDir, `${String(n).padStart(3, "0")}.md`);

const extraVersions: number[] = [];

Given("a second version of the plan exists on disk", async () => {
  await mkdir(planDir, { recursive: true });
  const path = extraVersionFile(99);
  await writeFile(path, "# Example plan with every supported markdown element\n\nRevision two.\n");
  extraVersions.push(99);
});

After(async () => {
  while (extraVersions.length > 0) {
    const n = extraVersions.pop();
    if (n === undefined) continue;
    await rm(extraVersionFile(n), { force: true });
  }
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

Then("the current version row is marked active", async ({ page }) => {
  const active = page.locator('[data-testid^="version-row-"][data-active="true"]');
  await active.first().waitFor({ state: "visible" });
});
