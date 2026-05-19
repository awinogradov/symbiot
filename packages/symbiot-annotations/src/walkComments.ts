import type { CommentEntry, PlateNode, PlateTextLeaf, PlateValue } from "./types.ts";

const commentIdPrefix = "comment_";

const isText = (node: PlateNode): node is PlateTextLeaf =>
  typeof (node as PlateTextLeaf).text === "string";

const commentIdsOf = (leaf: PlateTextLeaf): string[] => {
  const ids: string[] = [];
  for (const key of Object.keys(leaf)) {
    if (key.startsWith(commentIdPrefix) && leaf[key] === true) {
      ids.push(key.slice(commentIdPrefix.length));
    }
  }
  return ids;
};

const collectLeaves = (value: PlateValue): PlateTextLeaf[] => {
  const out: PlateTextLeaf[] = [];
  const visit = (node: PlateNode): void => {
    if (isText(node)) {
      out.push(node);
      return;
    }
    for (const child of node.children) visit(child);
  };
  for (const node of value) visit(node);
  return out;
};

const groupContiguous = (leaves: PlateTextLeaf[]): Map<string, string> => {
  const fragments = new Map<string, string>();
  for (const leaf of leaves) {
    for (const id of commentIdsOf(leaf)) {
      fragments.set(id, (fragments.get(id) ?? "") + leaf.text);
    }
  }
  return fragments;
};

/**
 * Walk a Plate value and extract one CommentEntry per discussion. The reviewer's
 * comment body comes from the editor's discussion store (passed in as
 * `commentBodies`); the anchor text is reconstructed by concatenating leaves
 * that share the same `comment_<id>` mark.
 */
export const walkComments = (
  value: PlateValue,
  commentBodies: Map<string, string>
): CommentEntry[] => {
  const anchors = groupContiguous(collectLeaves(value));
  const entries: CommentEntry[] = [];
  for (const [id, originalText] of anchors) {
    const body = commentBodies.get(id);
    if (body === undefined || body.length === 0) continue;
    entries.push({ id, originalText, body });
  }
  return entries;
};
