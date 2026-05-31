import { When } from "../support/bdd.ts";
import { browserSelect } from "../support/browserSelect.ts";

When("I select the text {string} in the editor", async ({ page }, needle: string) => {
  // The agent review steps open the viewer with a bare `page.goto` (no mount
  // wait), so guard against selecting before the editor has rendered — otherwise
  // browserSelect's `querySelector` races the mount and throws "editor-root not found".
  await page.getByTestId("editor-root").waitFor({ state: "visible" });
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
