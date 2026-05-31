import { join } from "node:path";

import { expect } from "@playwright/test";

import { Given, Then, When } from "../support/bdd.ts";
import { copilotHookBaseUrl } from "../support/copilotProcess.ts";
import { repoRoot } from "../support/world.ts";

const payloadPath = join(repoRoot, "fixtures", "agents", "copilot-agentstop.json");
const blockMarker = '"decision":"block"';

Given("the copilot agentStop hook is reviewing a plan", async ({ copilotHook }) => {
  await copilotHook.start(payloadPath);
});

When("I open the copilot review", async ({ page }) => {
  await page.goto(copilotHookBaseUrl);
});

Then("the copilot hook approves and exits without blocking", async ({ copilotHook }) => {
  const { code, stdout } = await copilotHook.result();
  expect(stdout).not.toContain(blockMarker);
  expect(code).toBe(0);
});

Then("the copilot hook emits a block decision", async ({ copilotHook }) => {
  const { stdout } = await copilotHook.result();
  expect(stdout).toContain(blockMarker);
});
