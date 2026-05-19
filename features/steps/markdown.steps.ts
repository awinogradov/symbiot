import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { Then } = createBdd();

Then("I see at least one rendered table", async ({ page }) => {
  await expect(page.locator('[data-testid="editor-root"] table').first()).toBeVisible();
});

Then("I see at least one rendered list", async ({ page }) => {
  await expect(
    page.locator('[data-testid="editor-root"] ul, [data-testid="editor-root"] ol').first()
  ).toBeVisible();
});

Then("I see a rendered heading at level {int}", async ({ page }, level: number) => {
  await expect(page.locator(`[data-testid="editor-root"] h${String(level)}`).first()).toBeVisible();
});

Then("I see a rendered fenced code block", async ({ page }) => {
  await expect(
    page.locator('[data-testid="editor-root"] pre, [data-testid="editor-root"] code').first()
  ).toBeVisible();
});
