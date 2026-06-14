import { expect } from "@playwright/test";

import { Then, When } from "../support/bdd.ts";

When("I scroll the code block into view", async ({ page }) => {
  // The fixture's code block sits below the fold; bring it on-screen so the
  // selection-anchored floating toolbar lands inside the viewport.
  await page.getByTestId("code-block").scrollIntoViewIfNeeded();
});

Then("the code block has syntax-highlighted tokens", async ({ page }) => {
  // Each `code_syntax` decoration renders a `code-syntax-token` leaf — its
  // presence proves the decorate ran on the live leaves.
  const tokens = page.getByTestId("code-block").getByTestId("code-syntax-token");
  await expect(tokens.first()).toBeVisible();
});

Then("a comment annotation mark is visible inside the code block", async ({ page }) => {
  const mark = page.getByTestId("code-block").getByTestId("annotation-comment");
  await expect(mark.first()).toBeVisible();
});
