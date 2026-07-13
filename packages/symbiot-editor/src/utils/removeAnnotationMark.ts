import type { PlateEditor } from "platejs/react";

import { type AnnotationKind, prefixOf } from "./annotationKind.ts";

interface TextLeaf {
  text: string;
  [mark: string]: unknown;
}

const isTextLeaf = (node: unknown): node is TextLeaf =>
  typeof (node as { text?: unknown }).text === "string";

const collectMatchingPaths = (
  nodes: readonly unknown[],
  idKey: string,
  path: number[],
  out: { leaf: TextLeaf; path: number[] }[]
): void => {
  nodes.forEach((node, index) => {
    const here = [...path, index];
    if (isTextLeaf(node)) {
      if (node[idKey] === true) out.push({ leaf: node, path: here });
      return;
    }
    const { children } = node as { children?: unknown[] };
    if (Array.isArray(children)) collectMatchingPaths(children, idKey, here, out);
  });
};

const hasSiblingIdMark = (leaf: TextLeaf, prefix: string, idKey: string): boolean => {
  for (const key of Object.keys(leaf)) {
    if (key === idKey) continue;
    if (key.startsWith(`${prefix}_`) && leaf[key] === true) return true;
  }
  return false;
};

/**
 * Unset the `comment_<id>` (or `suggestion_<id>`) mark from every text leaf
 * in the editor value, and also drop the umbrella `comment` / `suggestion`
 * mark on any leaf that no longer carries another sibling id mark. Mirrors
 * `applyComment` / `applyDeletion` (which add the same two marks together).
 */
export const removeAnnotationMark = (
  editor: PlateEditor,
  kind: AnnotationKind,
  id: string
): void => {
  const prefix = prefixOf(kind);
  const idKey = `${prefix}_${id}`;
  const matches: { leaf: TextLeaf; path: number[] }[] = [];
  collectMatchingPaths(editor.children, idKey, [], matches);

  for (const { leaf, path } of matches) {
    editor.tf.unsetNodes(idKey, { at: path });
    if (!hasSiblingIdMark(leaf, prefix, idKey)) {
      editor.tf.unsetNodes(prefix, { at: path });
    }
  }
};
