import { rm, readFile, stat } from "node:fs/promises";

import { expect } from "@playwright/test";

import { Given, Then } from "../support/bdd.ts";
import { annotateBaseUrl, annotateDecisionFile } from "../support/world.ts";

const resetAnnotateDecision = async (): Promise<void> => {
  await rm(annotateDecisionFile, { force: true });
};

const waitForAnnotateDecision = async (
  timeoutMs = 5_000
): Promise<{ kind: string; feedback?: string }> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await stat(annotateDecisionFile);
      const raw = await readFile(annotateDecisionFile, "utf8");
      return JSON.parse(raw) as { kind: string; feedback?: string };
    } catch {
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  throw new Error(`No annotate decision recorded within ${timeoutMs}ms`);
};

Given("I open the viewer in annotate mode", async ({ page }) => {
  await resetAnnotateDecision();
  await page.goto(annotateBaseUrl);
  await page.getByTestId("editor-root").waitFor({ state: "visible" });
});

Then(
  "the recorded annotate feedback contains {string}",
  // eslint-disable-next-line no-empty-pattern -- playwright-bdd requires an object pattern
  async ({}, snippet: string) => {
    const decision = await waitForAnnotateDecision();
    expect(decision.kind).toBe("feedback");
    expect(decision.feedback ?? "").toContain(snippet);
  }
);
