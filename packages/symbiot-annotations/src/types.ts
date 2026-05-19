/**
 * Compact tuple wire format (PRD §14 / plannotator parity contract).
 *
 * Phase 2 shipped `['C', …]` only. Phase 3 adds `['G', …]` (Global Comment) and
 * `['D', …]` (Deletion) for full plannotator interop. Phase 5 will add
 * `['I', …]` (Insertion) and `['R', …]` (Replacement) as symbiot-only extensions.
 */
export type CommentTuple = ["C", string, string, string?, string[]?];
export type GlobalCommentTuple = ["G", string, string?, string[]?];
export type DeletionTuple = ["D", string, string?, string[]?];

export type AnnotationTuple = CommentTuple | GlobalCommentTuple | DeletionTuple;

/** Source-line range for a block (1-based, inclusive). Optional. */
export interface BlockLines {
  startLine: number;
  endLine: number;
}

/** Reviewer-authored Comment annotation extracted from a Plate value. */
export interface CommentEntry {
  id: string;
  originalText: string;
  body: string;
  author?: string;
  images?: string[];
  lines?: BlockLines;
}

/** App-level global comment (not anchored to a Plate range). */
export interface GlobalCommentEntry {
  id: string;
  body: string;
  author?: string;
  images?: string[];
}

/** Suggested deletion of an anchored range. */
export interface DeletionEntry {
  id: string;
  originalText: string;
  author?: string;
  images?: string[];
  lines?: BlockLines;
}

/** Per-anchor or global, tagged with its kind so a single walker can return all three. */
export type AnnotationEntry =
  | ({ kind: "comment" } & CommentEntry)
  | ({ kind: "global" } & GlobalCommentEntry)
  | ({ kind: "deletion" } & DeletionEntry);

/** Convert a CommentEntry into its compact tuple form (plannotator parity). */
export const toCommentTuple = (entry: CommentEntry): CommentTuple => {
  if (entry.images !== undefined)
    return ["C", entry.originalText, entry.body, entry.author ?? "", entry.images];
  if (entry.author !== undefined) return ["C", entry.originalText, entry.body, entry.author];
  return ["C", entry.originalText, entry.body];
};

/** Convert a GlobalCommentEntry into its compact tuple form. */
export const toGlobalCommentTuple = (entry: GlobalCommentEntry): GlobalCommentTuple => {
  if (entry.images !== undefined) return ["G", entry.body, entry.author ?? "", entry.images];
  if (entry.author !== undefined) return ["G", entry.body, entry.author];
  return ["G", entry.body];
};

/** Convert a DeletionEntry into its compact tuple form. */
export const toDeletionTuple = (entry: DeletionEntry): DeletionTuple => {
  if (entry.images !== undefined)
    return ["D", entry.originalText, entry.author ?? "", entry.images];
  if (entry.author !== undefined) return ["D", entry.originalText, entry.author];
  return ["D", entry.originalText];
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
