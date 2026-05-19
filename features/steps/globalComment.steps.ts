import { createBdd } from "playwright-bdd";

const { When } = createBdd();

When("I open the global comment composer", async ({ page }) => {
  await page.getByTestId("top-bar-global-comment").click();
});

When("I type {string} into the global comment composer", async ({ page }, body: string) => {
  await page.getByTestId("global-composer-textarea").fill(body);
});

When("I press Enter in the global comment composer", async ({ page }) => {
  await page.getByTestId("global-composer-textarea").press("Enter");
});
