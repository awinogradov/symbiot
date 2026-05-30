import { join } from "node:path";

import { expect } from "@playwright/test";

import { Given, Then, When } from "../support/bdd.ts";
import { codexHookBaseUrl } from "../support/codexProcess.ts";
import { repoRoot } from "../support/world.ts";

const payloadPath = join(repoRoot, "fixtures", "agents", "codex-stop.json");
const blockMarker = '"decision":"block"';

Given("the codex Stop hook is reviewing a plan", async ({ codexHook }) => {
  await codexHook.start(payloadPath);
});

When("I open the codex review", async ({ page }) => {
  await page.goto(codexHookBaseUrl);
});

Then("the codex hook approves and exits without blocking", async ({ codexHook }) => {
  const { code, stdout } = await codexHook.result();
  expect(stdout).not.toContain(blockMarker);
  expect(code).toBe(0);
});

Then("the codex hook emits a block decision", async ({ codexHook }) => {
  const { stdout } = await codexHook.result();
  expect(stdout).toContain(blockMarker);
});
