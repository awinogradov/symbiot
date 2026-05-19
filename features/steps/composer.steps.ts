import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { Then, When } = createBdd();

When("I click the Comment toolbar button", async ({ page }) => {
  await page.getByTestId("toolbar-comment").click();
});

When("I type {string} into the comment composer", async ({ page }, body: string) => {
  await page.getByTestId("composer-textarea").fill(body);
});

When("I save the comment composer", async ({ page }) => {
  await page.getByTestId("composer-save").click();
});

When("I press Enter in the comment composer", async ({ page }) => {
  await page.getByTestId("composer-textarea").press("Enter");
});

Then("the comment composer is visible in the viewport", async ({ page }) => {
  await expect(page.getByTestId("comment-composer")).toBeInViewport();
});

interface Box {
  x: number;
  y: number;
}

const requireBox = (box: Box | null, name: string): Box => {
  if (box === null) throw new Error(`expected ${name} to have a bounding box`);
  return box;
};

Then("the comment composer is anchored near the selected text", async ({ page }) => {
  const anchor = requireBox(await page.getByTestId("composer-anchor").boundingBox(), "anchor");
  const composer = requireBox(await page.getByTestId("comment-composer").boundingBox(), "composer");
  expect(Math.abs(composer.y - anchor.y)).toBeLessThan(300);
  expect(Math.abs(composer.x - anchor.x)).toBeLessThan(300);
});
