import { mkdir, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import { expect } from "@playwright/test";

import { After, Given, Then } from "../support/bdd.ts";
import { fixturePlanSlug, fixtureProjectSlug } from "../support/testAssets.ts";

const draftFile = join(
  homedir(),
  ".symbiot",
  "agents",
  "claude-code",
  "drafts",
  fixtureProjectSlug,
  fixturePlanSlug,
  "draft.json"
);

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

const seedDraft = async (seed: DraftSeed): Promise<void> => {
  await mkdir(
    join(
      homedir(),
      ".symbiot",
      "agents",
      "claude-code",
      "drafts",
      fixtureProjectSlug,
      fixturePlanSlug
    ),
    { recursive: true }
  );
  await writeFile(draftFile, JSON.stringify(buildDraft(seed)), "utf8");
};

Given("a draft seeded with a comment whose stored anchor is missing from the plan", async () => {
  await seedDraft({ storedOriginalText: goneAnchor });
});

Given("a draft seeded with a comment whose stored anchor matches the plan", async () => {
  await seedDraft({ storedOriginalText: liveAnchor });
});

After(async () => {
  await rm(draftFile, { force: true });
});

Then("the drift badge for the seeded comment is visible", async ({ page }) => {
  await page.getByTestId(`sidebar-entry-${seededCommentId}-drift`).waitFor({ state: "visible" });
});

Then("the drift badge for the seeded comment is not visible", async ({ page }) => {
  // Wait for the sidebar to project the seeded entry, then assert no badge.
  await page.getByTestId(`sidebar-entry-${seededCommentId}`).waitFor({ state: "visible" });
  await expect(page.getByTestId(`sidebar-entry-${seededCommentId}-drift`)).toHaveCount(0);
});
