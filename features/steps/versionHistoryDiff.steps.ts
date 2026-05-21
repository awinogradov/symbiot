import { expect } from "@playwright/test";

import { Then, When } from "../support/bdd.ts";

When("I select the predecessor version row", async ({ page }) => {
  const inactive = page.locator('[data-testid^="version-row-"][data-active="false"]');
  await inactive.first().click();
});

Then("the diff editor is visible", async ({ page }) => {
  await page.getByTestId("diff-editor-root").waitFor({ state: "visible" });
});

Then("the diff mode toggle is visible", async ({ page }) => {
  await page.getByTestId("diff-mode-toggle").waitFor({ state: "visible" });
});

Then("the diff mode toggle is not visible", async ({ page }) => {
  await expect(page.getByTestId("diff-mode-toggle")).toHaveCount(0);
});

Then("the diff mode is {string}", async ({ page }, mode: string) => {
  const root = page.getByTestId("diff-editor-root");
  await expect(root).toHaveAttribute("data-diff-mode", mode);
});

When("I click the diff mode raw trigger", async ({ page }) => {
  await page.getByTestId("diff-mode-raw").click();
});

Then("the diff editor is in {string} mode", async ({ page }, mode: string) => {
  const root = page.getByTestId("diff-editor-root");
  await expect(root).toHaveAttribute("data-diff-mode", mode);
});
