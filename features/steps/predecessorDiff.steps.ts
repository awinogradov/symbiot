import { expect } from "@playwright/test";

import { Then, When } from "../support/bdd.ts";

Then("the compare with previous button is not visible", async ({ page }) => {
  await expect(page.getByTestId("compare-with-previous")).toHaveCount(0);
});

Then("the compare with previous button is visible", async ({ page }) => {
  await page.getByTestId("compare-with-previous").waitFor({ state: "visible" });
});

When("I click the compare with previous button", async ({ page }) => {
  await page.getByTestId("compare-with-previous").click();
});

Then("the back to editing button is visible", async ({ page }) => {
  await page.getByTestId("compare-back-to-editing").waitFor({ state: "visible" });
});

When("I click the back to editing button", async ({ page }) => {
  await page.getByTestId("compare-back-to-editing").click();
});

Then("the editor root is visible", async ({ page }) => {
  await page.getByTestId("editor-root").waitFor({ state: "visible" });
});
