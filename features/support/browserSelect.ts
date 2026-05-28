/**
 * Drive the browser's text selection to a literal substring inside the editor.
 * Runs inside `page.evaluate(...)`, so it must be self-contained — no closures
 * over Node-side scope, no imports, no project utilities. Used by both
 * `selection.steps.ts` (general "I select the text X" step) and
 * `a11y.steps.ts` (sets up a seed annotation before the axe scan). Extracted to
 * avoid the previous copy-paste between those two files.
 */
// eslint-disable-next-line complexity -- runs in browser context, must be self-contained for page.evaluate
export const browserSelect = (text: string): void => {
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
