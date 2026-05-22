import type { PlateEditor } from "platejs/react";

import { type AnnotationKind, prefixOf } from "./annotationKind.ts";

export type { AnnotationKind };

/** Identifier + captured anchor text returned after applying a mark to the selection. */
export interface AppliedAnnotation {
  id: string;
  anchorText: string;
}

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
