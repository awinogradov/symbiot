import { expect } from "@playwright/test";

import { Given, Then } from "../support/bdd.ts";
import { resetAnnotateDecisionFile, waitForAnnotateDecision } from "../support/fixtures.ts";
import { annotateBaseUrl } from "../support/world.ts";

Given("I open the viewer in annotate mode", async ({ page }) => {
  await resetAnnotateDecisionFile();
  await page.goto(annotateBaseUrl);
  await page.getByTestId("editor-root").waitFor({ state: "visible" });
});

Then("the recorded annotate feedback contains {string}", async ({}, snippet: string) => {
  const decision = await waitForAnnotateDecision();
  expect(decision.kind).toBe("feedback");
  expect(decision.feedback ?? "").toContain(snippet);
});
