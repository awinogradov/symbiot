import { expect } from "@playwright/test";

import { Given, Then } from "../support/bdd.ts";
import { noHeadingBaseUrl } from "../support/world.ts";

Given("I open a plan with no heading", async ({ page }) => {
  await page.goto(`${noHeadingBaseUrl}/`);
  await page.getByTestId("editor-root").waitFor({ state: "visible" });
});

// `—` is the em dash buildDocumentTitle inserts before the plan heading.
Then("the browser tab title includes the plan heading", async ({ page }) => {
  await expect(page).toHaveTitle(/^Symbiot · .+ — .+$/);
});

Then("the browser tab title shows only the project context", async ({ page }) => {
  await expect(page).toHaveTitle(/^Symbiot · [^—]+$/);
});
