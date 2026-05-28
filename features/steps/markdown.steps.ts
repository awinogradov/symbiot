import { expect } from "@playwright/test";

import { Then } from "../support/bdd.ts";

Then("I see at least one rendered table", async ({ page }) => {
  await expect(page.getByTestId("editor-table").first()).toBeVisible();
});

Then("I see at least one rendered list", async ({ page }) => {
  await expect(page.getByTestId("editor-list").first()).toBeVisible();
});

Then("I see a rendered heading at level {int}", async ({ page }, level: number) => {
  await expect(page.getByTestId(`editor-heading-${String(level)}`).first()).toBeVisible();
});

Then("I see a rendered fenced code block", async ({ page }) => {
  await expect(page.getByTestId("code-block").first()).toBeVisible();
});

Then("inline code renders without backticks", async ({ page }) => {
  const code = page.getByTestId("editor-code-inline").first();
  await expect(code).toBeVisible();
  await expect(code).toHaveText("inline code");
  const pseudo = await code.evaluate((el) => ({
    before: getComputedStyle(el, "::before").content,
    after: getComputedStyle(el, "::after").content,
  }));
  expect(pseudo.before).toBe("none");
  expect(pseudo.after).toBe("none");
});
