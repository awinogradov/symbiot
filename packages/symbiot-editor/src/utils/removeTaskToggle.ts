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
 * Remove a task toggle (the sidebar's "remove" action): drop the `task` /
 * `task_<id>` marks and restore the item's `checked` to its pre-toggle
 * `taskOriginal`.
 *
 * Nothing creates task toggles any more — the checkbox that produced them was
 * removed in #246. This is the read-back path for drafts persisted before that:
 * `useReviewState` saves the raw Plate value, so a reviewer who toggled a
 * checkbox on an earlier build still carries `checked` / `taskOriginal` /
 * `task_<id>` in their saved draft, still gets a task row projected into the
 * sidebar, and still needs a way to clear it.
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
