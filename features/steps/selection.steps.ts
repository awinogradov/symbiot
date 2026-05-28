import { When } from "../support/bdd.ts";
import { browserSelect } from "../support/browserSelect.ts";

When("I select the text {string} in the editor", async ({ page }, needle: string) => {
  await page.evaluate(browserSelect, needle);
  await page.getByTestId("toolbar-comment").waitFor({ state: "visible" });
  // browserSelect writes the DOM selection synchronously, so the first poll
  // resolves immediately — the wait stays as a defensive barrier against
  // Plate's batched observer transiently collapsing the range during commit.
  await page.waitForFunction(
    (text: string): boolean => (window.getSelection()?.toString() ?? "") === text,
    needle
  );
});
