import { Given } from "../support/bdd.ts";
import { resetDecisionFile } from "../support/fixtures.ts";

Given("I open the viewer", async ({ page }) => {
  await resetDecisionFile();
  await page.goto("/");
  await page.getByTestId("editor-root").waitFor({ state: "visible" });
});
