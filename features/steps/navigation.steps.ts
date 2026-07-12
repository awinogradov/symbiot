import { rm } from "node:fs/promises";
import { join } from "node:path";

import { Before, Given } from "../support/bdd.ts";
import { resetDecisionFile } from "../support/fixtures.ts";

// Draft isolation (symbiot#236): drafts persist across scenarios within a worker
// (shared HOME + plan slug), and useDraft's debounced PUT can flush mid-scenario —
// e.g. during a slow overlay dismiss — leaving a draft the NEXT scenario hydrates
// as foreign annotation marks. Clearing before EVERY scenario (rather than inside
// the open steps) keeps seeded-draft Givens working: they run after this hook.
Before(async ({ symbiotHome }) => {
  await rm(join(symbiotHome, ".symbiot", "agents", "claude-code", "drafts"), {
    recursive: true,
    force: true,
  });
});

Given("I open the viewer", async ({ page, planDecisionFile }) => {
  await resetDecisionFile(planDecisionFile);
  await page.goto("/");
  await page.getByTestId("editor-root").waitFor({ state: "visible" });
});
