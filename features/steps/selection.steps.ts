import { createBdd } from "playwright-bdd";

const { When } = createBdd();

interface TextHit {
  node: Text;
  offset: number;
}

const findTextHit = (root: Element, needle: string): TextHit | null => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node !== null) {
    const i = (node.textContent ?? "").indexOf(needle);
    if (i >= 0) return { node: node as Text, offset: i };
    node = walker.nextNode();
  }
  return null;
};

const applyRange = (hit: TextHit, length: number): void => {
  const range = document.createRange();
  range.setStart(hit.node, hit.offset);
  range.setEnd(hit.node, hit.offset + length);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
};

const selectTextInEditor = (needle: string): void => {
  const root = document.querySelector('[data-testid="editor-root"]');
  if (root === null) throw new Error("editor-root not found");
  const hit = findTextHit(root, needle);
  if (hit === null) throw new Error(`Text "${needle}" not found in editor`);
  applyRange(hit, needle.length);
};

When("I select the text {string} in the editor", async ({ page }, needle: string) => {
  await page.evaluate(selectTextInEditor, needle);
});
