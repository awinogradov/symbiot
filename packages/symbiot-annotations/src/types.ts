/**
 * Compact tuple wire format for annotations. Each tuple type maps to one
 * annotation kind on the wire; the serializer/walker pair owns the round-trip.
 */
export type CommentTuple = ["C", string, string, string?, string[]?];
export type GlobalCommentTuple = ["G", string, string?, string[]?];
export type DeletionTuple = ["D", string, string?, string[]?];
export type InsertionTuple = ["I", string, string, string?, string[]?];
export type ReplacementTuple = ["R", string, string, string?, string[]?];
/** Task-checkbox toggle: `["T", originalText, "1" | "0", author?]` (`"1"` = mark done). */
export type TaskToggleTuple = ["T", string, "0" | "1", string?];

export type AnnotationTuple =
  | CommentTuple
  | GlobalCommentTuple
  | DeletionTuple
  | InsertionTuple
  | ReplacementTuple
  | TaskToggleTuple;

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
  /**
   * `true` when the captured `originalText` no longer matches the live anchor
   * AND can't be re-located in the value via text-quote fallback. Set by the
   * walker when an `originalText` sidecar map is supplied.
   */
  drifted?: boolean;
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
  /** See {@link CommentEntry.drifted}. */
  drifted?: boolean;
}

/**
 * Suggested insertion of new text after an anchored context span. The
 * `contextText` snapshot is the anchor (resolved via dual-anchor under drift);
 * `newText` is the proposed insertion.
 */
export interface InsertionEntry {
  id: string;
  contextText: string;
  newText: string;
  author?: string;
  images?: string[];
  lines?: BlockLines;
  /** See {@link CommentEntry.drifted}. */
  drifted?: boolean;
}

/**
 * Suggested replacement of an anchored span with new text. The `originalText`
 * snapshot is the anchor; `replacementText` is the proposed substitution.
 */
export interface ReplacementEntry {
  id: string;
  originalText: string;
  replacementText: string;
  author?: string;
  images?: string[];
  lines?: BlockLines;
  /** See {@link CommentEntry.drifted}. */
  drifted?: boolean;
}

/**
 * Reviewer toggle of a GFM task checkbox. `originalText` is the item label
 * (the anchor); `checked` is the proposed new state (`true` = mark done). The
 * plan is annotate-only, so the toggle is feedback, not a source edit.
 */
export interface TaskToggleEntry {
  id: string;
  originalText: string;
  checked: boolean;
  author?: string;
  lines?: BlockLines;
  /** See {@link CommentEntry.drifted}. */
  drifted?: boolean;
}

/** Per-anchor or global, tagged with its kind so a single walker can return all six. */
export type AnnotationEntry =
  | ({ kind: "comment" } & CommentEntry)
  | ({ kind: "global" } & GlobalCommentEntry)
  | ({ kind: "deletion" } & DeletionEntry)
  | ({ kind: "insertion" } & InsertionEntry)
  | ({ kind: "replacement" } & ReplacementEntry)
  | ({ kind: "task" } & TaskToggleEntry);

/** Convert a CommentEntry into its compact tuple form. */
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

/** Convert an InsertionEntry into its compact tuple form. */
export const toInsertionTuple = (entry: InsertionEntry): InsertionTuple => {
  if (entry.images !== undefined)
    return ["I", entry.contextText, entry.newText, entry.author ?? "", entry.images];
  if (entry.author !== undefined) return ["I", entry.contextText, entry.newText, entry.author];
  return ["I", entry.contextText, entry.newText];
};

/** Convert a ReplacementEntry into its compact tuple form. */
export const toReplacementTuple = (entry: ReplacementEntry): ReplacementTuple => {
  if (entry.images !== undefined)
    return ["R", entry.originalText, entry.replacementText, entry.author ?? "", entry.images];
  if (entry.author !== undefined)
    return ["R", entry.originalText, entry.replacementText, entry.author];
  return ["R", entry.originalText, entry.replacementText];
};

/** Convert a TaskToggleEntry into its compact tuple form. */
export const toTaskToggleTuple = (entry: TaskToggleEntry): TaskToggleTuple => {
  const checked = entry.checked ? "1" : "0";
  if (entry.author !== undefined) return ["T", entry.originalText, checked, entry.author];
  return ["T", entry.originalText, checked];
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
