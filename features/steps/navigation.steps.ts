import { createBdd } from "playwright-bdd";

import { resetDecisionFile } from "../support/fixtures.ts";

const { Given } = createBdd();

Given("I open the viewer", async ({ page }) => {
  await resetDecisionFile();
  await page.goto("/");
  await page.getByTestId("editor-root").waitFor({ state: "visible" });
});
