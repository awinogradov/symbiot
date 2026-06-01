import { expect } from "@playwright/test";

import { Then } from "../support/bdd.ts";
import { waitForDecision } from "../support/fixtures.ts";

Then("the recorded feedback contains {string}", async ({ planDecisionFile }, snippet: string) => {
  const decision = await waitForDecision(planDecisionFile);
  expect(decision.kind).toBe("deny");
  expect(decision.feedback ?? "").toContain(snippet);
});
