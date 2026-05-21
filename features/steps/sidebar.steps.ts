import { expect } from "@playwright/test";

import { When, Then } from "../support/bdd.ts";

When("I clear all annotations and confirm", async ({ page }) => {
  await page.getByTestId("sidebar-clear-all").click();
  await page.getByTestId("sidebar-clear-confirm").click();
});

When("I remove the annotation on card {int} and confirm", async ({ page }, n: number) => {
  await page
    .locator('[data-testid$="-remove"][data-sidebar="menu-action"]')
    .nth(n - 1)
    .click();
  await page.getByTestId("sidebar-entry-remove-confirm").click();
});

When("I open the remove dialog on card {int} and cancel", async ({ page }, n: number) => {
  await page
    .locator('[data-testid$="-remove"][data-sidebar="menu-action"]')
    .nth(n - 1)
    .click();
  await page.getByTestId("sidebar-entry-remove-cancel").click();
});

Then("the sidebar total count reads {string}", async ({ page }, expected: string) => {
  await expect(page.getByTestId("sidebar-total-count")).toHaveText(expected);
});
