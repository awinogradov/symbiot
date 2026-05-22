import { When } from "../support/bdd.ts";

When("I click the Replace toolbar button", async ({ page }) => {
  await page.getByTestId("toolbar-replace").click();
});
