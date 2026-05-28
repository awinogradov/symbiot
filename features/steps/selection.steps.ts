import { When } from "../support/bdd.ts";

// eslint-disable-next-line complexity -- runs in browser context, must be self-contained for page.evaluate
const browserSelect = (text: string): void => {
  const root = document.querySelector('[data-testid="editor-root"]');
  if (root === null) throw new Error("editor-root not found");
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let hit: { node: Text; offset: number } | null = null;
  let node = walker.nextNode();
  while (node !== null && hit === null) {
    const offset = (node.textContent ?? "").indexOf(text);
    if (offset >= 0) hit = { node: node as Text, offset };
    node = walker.nextNode();
  }
  if (hit === null) throw new Error(`Text "${text}" not found in editor`);
  const range = document.createRange();
  range.setStart(hit.node, hit.offset);
  range.setEnd(hit.node, hit.offset + text.length);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
};

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
