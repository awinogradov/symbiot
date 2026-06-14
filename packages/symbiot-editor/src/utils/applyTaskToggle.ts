import type { PlateEditor } from "platejs/react";

interface TextLeaf {
  text: string;
  [mark: string]: unknown;
}

interface ElementNode {
  children: unknown[];
  [prop: string]: unknown;
}

const isTextLeaf = (node: unknown): node is TextLeaf =>
  typeof (node as { text?: unknown }).text === "string";

const isElement = (node: unknown): node is ElementNode =>
  Array.isArray((node as { children?: unknown }).children);

/** Reference-search the value for `target`, returning its Slate path or null. */
const findElementPath = (
  nodes: readonly unknown[],
  target: unknown,
  base: number[]
): number[] | null => {
  for (const [index, node] of nodes.entries()) {
    const here = [...base, index];
    if (node === target) return here;
    if (!isElement(node)) continue;
    const found = findElementPath(node.children, target, here);
    if (found !== null) return found;
  }
  return null;
};

/** Collect the path of every text leaf descending from `path`. */
const collectTextLeafPaths = (node: unknown, path: number[], out: number[][]): void => {
  if (isTextLeaf(node)) {
    out.push(path);
    return;
  }
  if (isElement(node)) {
    for (const [index, child] of node.children.entries()) {
      collectTextLeafPaths(child, [...path, index], out);
    }
  }
};

const taskIdOfLeaf = (leaf: TextLeaf): string | null => {
  const key = Object.keys(leaf).find((k) => k.startsWith("task_") && leaf[k] === true);
  return key === undefined ? null : key.slice("task_".length);
};

/** First `task_<id>` mark id carried by any text leaf under `node`, or null. */
const findTaskId = (node: unknown): string | null => {
  if (isTextLeaf(node)) return taskIdOfLeaf(node);
  if (!isElement(node)) return null;
  for (const child of node.children) {
    const found = findTaskId(child);
    if (found !== null) return found;
  }
  return null;
};

const setLeafMarks = (
  editor: PlateEditor,
  itemPath: number[],
  node: unknown,
  marks: object
): void => {
  const leaves: number[][] = [];
  collectTextLeafPaths(node, itemPath, leaves);
  for (const at of leaves) editor.tf.setNodes(marks, { at });
};

const unsetLeafMarks = (
  editor: PlateEditor,
  itemPath: number[],
  node: unknown,
  keys: string[]
): void => {
  const leaves: number[][] = [];
  collectTextLeafPaths(node, itemPath, leaves);
  for (const at of leaves) editor.tf.unsetNodes(keys, { at });
};

/**
 * Toggle a GFM task checkbox as reviewer feedback (the plan is annotate-only,
 * so the toggle is recorded, not written back to source). Flips the item's
 * `checked` and tags its text with `task` / `task_<id>` marks the walker reads.
 * `taskOriginal` snapshots the pre-toggle state so toggling back to the
 * original removes the marks and the feedback entirely.
 */
export const applyTaskToggle = (editor: PlateEditor, element: unknown): void => {
  const itemPath = findElementPath(editor.children, element, []);
  if (itemPath === null || !isElement(element)) return;
  const current = element["checked"] === true;
  const newChecked = !current;
  const existingId = findTaskId(element);

  if (existingId === null) {
    const id = crypto.randomUUID();
    editor.tf.setNodes({ checked: newChecked, taskOriginal: current }, { at: itemPath });
    setLeafMarks(editor, itemPath, element, { task: true, [`task_${id}`]: true });
    return;
  }

  const original = element["taskOriginal"] === true;
  if (newChecked === original) {
    unsetLeafMarks(editor, itemPath, element, ["task", `task_${existingId}`]);
    editor.tf.setNodes({ checked: newChecked, taskOriginal: null }, { at: itemPath });
    return;
  }
  editor.tf.setNodes({ checked: newChecked }, { at: itemPath });
};

/** First top-level block carrying a `task_<id>` mark, with its index, or null. */
const findTaskItem = (
  children: readonly unknown[],
  id: string
): { node: ElementNode; index: number } | null => {
  for (const [index, node] of children.entries()) {
    if (isElement(node) && findTaskId(node) === id) return { node, index };
  }
  return null;
};

/**
 * Remove a task toggle (sidebar "remove"): drop the `task` / `task_<id>` marks
 * and restore the item's `checked` to its pre-toggle `taskOriginal`, mirroring
 * the toggle-back-to-original branch of {@link applyTaskToggle}.
 */
export const removeTaskToggle = (editor: PlateEditor, id: string): void => {
  const match = findTaskItem(editor.children, id);
  if (match === null) return;
  const itemPath = [match.index];
  unsetLeafMarks(editor, itemPath, match.node, ["task", `task_${id}`]);
  editor.tf.setNodes(
    { checked: match.node["taskOriginal"] === true, taskOriginal: null },
    { at: itemPath }
  );
};
