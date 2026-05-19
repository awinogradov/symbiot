import { createBdd } from "playwright-bdd";

const { When } = createBdd();

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
