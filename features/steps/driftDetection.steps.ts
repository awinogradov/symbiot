import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { expect } from "@playwright/test";

import { After, Given, Then } from "../support/bdd.ts";
import { fixturePlanSlug, fixtureProjectSlug } from "../support/testAssets.ts";

// Resolved from the per-worker `symbiotHome` fixture so the seeded draft lands in
// the same isolated `~/.symbiot` the worker's viewer reads — never the real home.
const draftDir = (home: string): string =>
  join(home, ".symbiot", "agents", "claude-code", "drafts", fixtureProjectSlug, fixturePlanSlug);
const draftFile = (home: string): string => join(draftDir(home), "draft.json");

const seededCommentId = "drift-test-comment";
const liveAnchor = "live anchor";
const goneAnchor = "GONE-ANCHOR-FIXTURE";

interface DraftSeed {
  storedOriginalText: string;
}

const buildDraft = ({ storedOriginalText }: DraftSeed): unknown => ({
  value: [
    {
      type: "p",
      children: [{ text: liveAnchor, comment: true, [`comment_${seededCommentId}`]: true }],
    },
  ],
  commentBodies: { [seededCommentId]: "needs revision" },
  commentImages: {},
  commentOriginalTexts: { [seededCommentId]: storedOriginalText },
  suggestionOriginalTexts: {},
  globalComments: [],
  updatedAt: Date.now(),
});

const seedDraft = async (home: string, seed: DraftSeed): Promise<void> => {
  await mkdir(draftDir(home), { recursive: true });
  await writeFile(draftFile(home), JSON.stringify(buildDraft(seed)), "utf8");
};

Given(
  "a draft seeded with a comment whose stored anchor is missing from the plan",
  async ({ symbiotHome }) => {
    await seedDraft(symbiotHome, { storedOriginalText: goneAnchor });
  }
);

Given(
  "a draft seeded with a comment whose stored anchor matches the plan",
  async ({ symbiotHome }) => {
    await seedDraft(symbiotHome, { storedOriginalText: liveAnchor });
  }
);

After(async ({ symbiotHome }) => {
  await rm(draftFile(symbiotHome), { force: true });
});

Then("the drift badge for the seeded comment is visible", async ({ page }) => {
  await page.getByTestId(`sidebar-entry-${seededCommentId}-drift`).waitFor({ state: "visible" });
});

Then("the drift badge for the seeded comment is not visible", async ({ page }) => {
  // Wait for the sidebar to project the seeded entry, then assert no badge.
  await page.getByTestId(`sidebar-entry-${seededCommentId}`).waitFor({ state: "visible" });
  await expect(page.getByTestId(`sidebar-entry-${seededCommentId}-drift`)).toHaveCount(0);
});
