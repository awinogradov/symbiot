import { readFile } from "node:fs/promises";

import { expect } from "@playwright/test";

import { Given, Then, When } from "../support/bdd.ts";
import { resetDecisionFile, waitForDecision } from "../support/fixtures.ts";

Given("I open the draft viewer", async ({ page, draftUrl }) => {
  await page.goto(draftUrl);
});

Given("I open the draft iterate viewer", async ({ page, draftIterateUrl }) => {
  await page.goto(draftIterateUrl);
});

Then("the draft editor is visible", async ({ page }) => {
  await page.getByTestId("draft-editor-root").waitFor({ state: "visible" });
});

Then("the draft top bar offers Send to agent and Approve", async ({ page }) => {
  await page.getByTestId("send-to-agent").waitFor({ state: "visible" });
  await page.getByTestId("top-bar-approve").waitFor({ state: "visible" });
});

Then("the annotation toolbar is not available", async ({ page }) => {
  await expect(page.getByTestId("toolbar-comment")).toHaveCount(0);
});

When("I type {string} into the draft editor", async ({ page }, text: string) => {
  await page.getByTestId("draft-editor-root").getByTestId("editor-paragraph").first().click();
  await page.keyboard.type(text);
});

Then("the draft editor contains {string}", async ({ page }, text: string) => {
  await expect(page.getByTestId("draft-editor-root")).toContainText(text);
});

When("I send the draft to the agent", async ({ page, draftDecisionFile }) => {
  await resetDecisionFile(draftDecisionFile);
  await page.getByTestId("send-to-agent").click();
});

When("I approve the draft", async ({ page, draftDecisionFile }) => {
  await resetDecisionFile(draftDecisionFile);
  await page.getByTestId("top-bar-approve").click();
});

Then(
  "a draft decision is recorded pointing at a persisted revision",
  async ({ draftDecisionFile }) => {
    const decision = await waitForDecision(draftDecisionFile);
    expect(decision.kind).toBe("draft");
    if (decision.path === undefined) throw new Error("draft decision carries no path");
    expect(await readFile(decision.path, "utf8")).toContain("# Draft seed plan");
  }
);

Then(
  "an approve decision is recorded pointing at the persisted plan",
  async ({ draftDecisionFile }) => {
    const decision = await waitForDecision(draftDecisionFile);
    expect(decision.kind).toBe("approve");
    if (decision.path === undefined) throw new Error("approve decision carries no path");
    expect(await readFile(decision.path, "utf8")).toContain("# Draft seed plan");
  }
);

Then("the submitted screen confirms the draft was sent", async ({ page }) => {
  await expect(page.getByTestId("submitted-screen")).toContainText("Draft sent to the agent.");
});

Then("the submitted screen confirms the plan was approved", async ({ page }) => {
  await expect(page.getByTestId("submitted-screen")).toContainText("Plan approved");
});
