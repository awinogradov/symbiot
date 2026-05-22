import type { PlateEditor } from "platejs/react";

/** Annotation kinds that can be authored from the selection toolbar. */
export type AnnotationKind = "comment" | "deletion" | "insertion" | "replacement";

/** Identifier + captured anchor text returned after applying a mark to the selection. */
export interface AppliedAnnotation {
  id: string;
  anchorText: string;
}

// Deletion authoring writes the legacy `suggestion`/`suggestion_<id>` mark
// pair (Phase 3.2 wire-format compatibility with the walker + DeletionLeaf).
// Comment / Insertion / Replacement use marks that match their kind name.
const prefixOf = (kind: AnnotationKind): "comment" | "suggestion" | "insertion" | "replacement" => {
  if (kind === "comment") return "comment";
  if (kind === "insertion") return "insertion";
  if (kind === "replacement") return "replacement";
  return "suggestion";
};

/**
 * Apply an annotation mark pair to the current editor selection. Pattern A —
 * editor stays `readOnly`, marks bypass `contenteditable=false` via
 * `editor.tf.addMarks`. Returns the freshly generated id + captured anchor
 * text so the caller can persist a body / context entry in its store.
 *
 * The walker (`walkAnnotations`) keys per-kind off the `${prefix}_<id>` mark.
 */
export const applyAnnotation = (
  editor: PlateEditor,
  kind: AnnotationKind
): AppliedAnnotation | null => {
  if (editor.selection === null) return null;
  const anchorText = editor.api.string(editor.selection);
  if (anchorText.length === 0) return null;
  const id = crypto.randomUUID();
  const prefix = prefixOf(kind);
  editor.tf.addMarks({ [prefix]: true, [`${prefix}_${id}`]: true });
  return { id, anchorText };
};
