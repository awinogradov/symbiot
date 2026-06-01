import { join } from "node:path";

import { expect } from "@playwright/test";

import { Given, Then, When } from "../support/bdd.ts";
import { repoRoot } from "../support/world.ts";

const payloadPath = join(repoRoot, "fixtures", "agents", "gemini-afteragent.json");
const blockMarker = '"decision":"block"';

Given("the gemini AfterAgent hook is reviewing a plan", async ({ geminiHook }) => {
  await geminiHook.start(payloadPath);
});

When("I open the gemini review", async ({ page, geminiHook }) => {
  await page.goto(geminiHook.baseUrl);
});

Then("the gemini hook approves and exits without blocking", async ({ geminiHook }) => {
  const { code, stdout } = await geminiHook.result();
  expect(stdout).not.toContain(blockMarker);
  expect(code).toBe(0);
});

Then("the gemini hook emits a block decision", async ({ geminiHook }) => {
  const { stdout } = await geminiHook.result();
  expect(stdout).toContain(blockMarker);
});
