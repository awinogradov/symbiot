import { expect } from "@playwright/test";

import { When, Then } from "../support/bdd.ts";
import { waitForDecision } from "../support/fixtures.ts";

When("I click Approve", async ({ page }) => {
  await page.getByTestId("top-bar-approve").click();
});

When("I click Request changes", async ({ page }) => {
  await page.getByTestId("top-bar-deny").click();
});

// eslint-disable-next-line no-empty-pattern -- playwright-bdd requires an object pattern in the first arg
Then("the recorded decision is {string}", async ({}, expected: string) => {
  const decision = await waitForDecision();
  expect(decision.kind).toBe(expected);
});
