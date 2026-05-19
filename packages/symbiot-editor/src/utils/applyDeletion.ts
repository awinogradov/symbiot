import type { PlateEditor } from "platejs/react";

/** Identifier + captured anchor text returned after applying a Deletion mark. */
export interface AppliedDeletion {
  id: string;
  originalText: string;
}

const deletionMarks = (id: string): Record<string, true> => ({
  suggestion: true,
  [`suggestion_${id}`]: true,
});

/**
 * Apply a Deletion mark to the current editor selection. Mirrors applyComment:
 * the editor stays readOnly, marks are added via `editor.tf.addMarks` which
 * bypasses contenteditable=false. The walker (`walkAnnotations`) surfaces
 * these as D-tuple entries via the `suggestion_<id>` mark prefix.
 *
 * Phase 3.2 uses a minimal mark-only approach instead of the full
 * @platejs/suggestion plugin since the D-tuple semantics preserve the
 * originalText rather than actually deleting it from the value.
 */
export const applyDeletion = (editor: PlateEditor): AppliedDeletion | null => {
  if (editor.selection === null) return null;
  const originalText = editor.api.string(editor.selection);
  if (originalText.length === 0) return null;
  const id = crypto.randomUUID();
  editor.tf.addMarks(deletionMarks(id));
  return { id, originalText };
};
