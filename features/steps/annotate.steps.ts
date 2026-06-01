import { expect } from "@playwright/test";

import { Given, Then } from "../support/bdd.ts";
import { resetDecisionFile, waitForDecision } from "../support/fixtures.ts";

Given("I open the viewer in annotate mode", async ({ page, annotateUrl, annotateDecisionFile }) => {
  await resetDecisionFile(annotateDecisionFile);
  await page.goto(annotateUrl);
  await page.getByTestId("editor-root").waitFor({ state: "visible" });
});

Then(
  "the recorded annotate feedback contains {string}",
  async ({ annotateDecisionFile }, snippet: string) => {
    const decision = await waitForDecision(annotateDecisionFile);
    expect(decision.kind).toBe("feedback");
    expect(decision.feedback ?? "").toContain(snippet);
  }
);
