import { expect } from "@playwright/test";

import { Then, When } from "../support/bdd.ts";

When("I edit the annotation on card {int}", async ({ page }, n: number) => {
  await page
    .locator('[data-testid$="-edit"][data-sidebar="menu-action"]')
    .nth(n - 1)
    .click();
});

Then("the edit composer is visible in the viewport", async ({ page }) => {
  await expect(
    page.locator('[data-testid="annotation-composer"][data-mode="edit"]')
  ).toBeInViewport();
});

Then("the comment composer body reads {string}", async ({ page }, body: string) => {
  await expect(page.getByTestId("composer-textarea")).toHaveValue(body);
});

Then("the global edit composer is visible in the viewport", async ({ page }) => {
  await expect(
    page.locator('[data-testid="global-comment-composer"][data-mode="edit"]')
  ).toBeInViewport();
});

Then("the global comment composer body reads {string}", async ({ page }, body: string) => {
  await expect(page.getByTestId("global-composer-textarea")).toHaveValue(body);
});
