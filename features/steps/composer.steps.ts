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

Then("the comment composer is visible in the viewport", async ({ page }) => {
  await expect(page.getByTestId("comment-composer")).toBeInViewport();
});

Then("the comment composer shows {string} as a quote", async ({ page }, text: string) => {
  await expect(page.getByTestId("composer-quote")).toHaveText(text);
});
