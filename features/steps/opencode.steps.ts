import { expect } from "@playwright/test";

import { Given, Then, When } from "../support/bdd.ts";
import { opencodeHookBaseUrl } from "../support/opencodeProcess.ts";

Given("the opencode plugin is reviewing an idle session", async ({ opencodeHook }) => {
  await opencodeHook.start();
});

When("I open the opencode review", async ({ page }) => {
  await page.goto(opencodeHookBaseUrl);
});

Then("the opencode plugin saves the response to the inbox", async ({ opencodeHook }) => {
  expect(await opencodeHook.inboxContents()).toContain("quick brown fox");
});

Then("the opencode plugin injects the feedback into the next turn", async ({ opencodeHook }) => {
  const { code, injected } = await opencodeHook.result();
  expect(code).toBe(0);
  expect(injected ?? "").toContain("[Reviewer feedback]: ");
  expect(injected ?? "").toContain("Please expand the test plan");
});
