import { createBdd } from "playwright-bdd";

const { When } = createBdd();

When("I click the Delete toolbar button", async ({ page }) => {
  await page.getByTestId("toolbar-delete").click();
});
