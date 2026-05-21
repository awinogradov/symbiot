import { expect } from "@playwright/test";

import { When, Then } from "../support/bdd.ts";

When("I clear all annotations and confirm", async ({ page }) => {
  await page.getByTestId("sidebar-clear-all").click();
  await page.getByTestId("sidebar-clear-confirm").click();
});

Then("the sidebar total count reads {string}", async ({ page }, expected: string) => {
  await expect(page.getByTestId("sidebar-total-count")).toHaveText(expected);
});
