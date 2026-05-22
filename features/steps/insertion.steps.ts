import { When } from "../support/bdd.ts";

When("I click the Insert toolbar button", async ({ page }) => {
  await page.getByTestId("toolbar-insert").click();
});
