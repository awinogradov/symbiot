import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";

import { waitForDecision } from "../support/fixtures.ts";

const { Then } = createBdd();

Then(
  "the recorded feedback contains {string}",
  // eslint-disable-next-line no-empty-pattern -- playwright-bdd requires an object pattern
  async ({}, snippet: string) => {
    const decision = await waitForDecision();
    expect(decision.kind).toBe("deny");
    expect(decision.feedback ?? "").toContain(snippet);
  }
);
