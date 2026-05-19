/**
 * Compact tuple wire format (PRD §14 / plannotator parity contract).
 *
 * Phase 2 ships the `['C', …]` Comment tuple only. Phases 3 and 5 add
 * `['G', …]`, `['D', …]`, `['I', …]`, `['R', …]`.
 */
export type CommentTuple = ["C", string, string, string?, string[]?];

/** Reviewer-authored Comment annotation extracted from a Plate value. */
export interface CommentEntry {
  id: string;
  originalText: string;
  body: string;
  author?: string;
  images?: string[];
}

/** Convert a CommentEntry into its compact tuple form (plannotator parity). */
export const toCommentTuple = (entry: CommentEntry): CommentTuple => {
  if (entry.images !== undefined)
    return ["C", entry.originalText, entry.body, entry.author ?? "", entry.images];
  if (entry.author !== undefined) return ["C", entry.originalText, entry.body, entry.author];
  return ["C", entry.originalText, entry.body];
};

/** A text leaf in a Plate value; mark keys (e.g. `comment_<id>: true`) live alongside `text`. */
export interface PlateTextLeaf {
  text: string;
  [mark: string]: unknown;
}

/** An element node (paragraph, heading, list item, ...) holding child nodes. */
export interface PlateElementNode {
  type?: string;
  children: PlateNode[];
  [prop: string]: unknown;
}

export type PlateNode = PlateTextLeaf | PlateElementNode;

export type PlateValue = PlateNode[];
