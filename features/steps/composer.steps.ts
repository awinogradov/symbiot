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

When("I close the comment composer via the overlay", async ({ page }) => {
  // Click the top-left corner of the overlay (overlay-only — the dialog content
  // is anchored to the selection, never the top-left). The composer plays an
  // entrance animation, so a single click can land before the overlay is
  // dismissible; retry the click until the composer actually closes.
  const composer = page.getByTestId("annotation-composer");
  await expect(async () => {
    await page.getByTestId("dialog-overlay").click({ position: { x: 5, y: 5 } });
    await expect(composer).toHaveCount(0, { timeout: 1_000 });
  }).toPass({ timeout: 10_000 });
});

When("I click the comment composer Cancel button", async ({ page }) => {
  await page.getByTestId("composer-cancel").click();
});

Then("the comment composer is visible in the viewport", async ({ page }) => {
  await expect(page.getByTestId("annotation-composer")).toBeInViewport();
});

Then("the comment composer is not visible in the viewport", async ({ page }) => {
  await expect(page.getByTestId("annotation-composer")).toHaveCount(0);
});

Then("the comment composer shows {string} as a quote", async ({ page }, text: string) => {
  await expect(page.getByTestId("composer-quote")).toHaveText(text);
});
