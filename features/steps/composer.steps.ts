import { expect } from "@playwright/test";

import { Then, When } from "../support/bdd.ts";

When("I click the Comment toolbar button", async ({ page }) => {
  await page.getByTestId("toolbar-comment").click();
});

When("I type {string} into the comment composer", async ({ page }, body: string) => {
  await page.getByTestId("composer-textarea").fill(body);
});

When("I save the comment composer", async ({ page }) => {
  await page.getByTestId("composer-save").click();
});

When("I press Enter in the comment composer", async ({ page }) => {
  await page.getByTestId("composer-textarea").press("Enter");
});

When("I press Escape in the comment composer", async ({ page }) => {
  await page.getByTestId("composer-textarea").press("Escape");
});

When("I close the comment composer via the X button", async ({ page }) => {
  await page.getByTestId("comment-composer").getByLabel("Close").click();
});

When("I close the comment composer via the overlay", async ({ page }) => {
  // Click the top-left corner of the overlay — the dialog content is centered,
  // so this coordinate is overlay-only and not intercepted by the dialog.
  await page.locator('[data-slot="dialog-overlay"]').click({ position: { x: 5, y: 5 } });
});

When("I click the comment composer Cancel button", async ({ page }) => {
  await page.getByTestId("composer-cancel").click();
});

Then("the comment composer is visible in the viewport", async ({ page }) => {
  await expect(page.getByTestId("comment-composer")).toBeInViewport();
});

Then("the comment composer is not visible in the viewport", async ({ page }) => {
  await expect(page.getByTestId("comment-composer")).toHaveCount(0);
});

Then("the comment composer shows {string} as a quote", async ({ page }, text: string) => {
  await expect(page.getByTestId("composer-quote")).toHaveText(text);
});
