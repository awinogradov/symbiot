import { expect } from "@playwright/test";

import { Then } from "../support/bdd.ts";
import { waitForDecision } from "../support/fixtures.ts";

Then(
  "the recorded feedback contains {string}",
  // eslint-disable-next-line no-empty-pattern -- playwright-bdd requires an object pattern
  async ({}, snippet: string) => {
    const decision = await waitForDecision();
    expect(decision.kind).toBe("deny");
    expect(decision.feedback ?? "").toContain(snippet);
  }
);
