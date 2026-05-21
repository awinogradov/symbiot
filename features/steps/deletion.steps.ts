import { When } from "../support/bdd.ts";

When("I click the Delete toolbar button", async ({ page }) => {
  await page.getByTestId("toolbar-delete").click();
});
