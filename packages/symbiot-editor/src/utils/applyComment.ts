import type { PlateEditor } from "platejs/react";

/** Identifier + captured anchor text returned after applying a Comment mark. */
export interface AppliedComment {
  id: string;
  originalText: string;
}

const commentMarks = (id: string): Record<string, true> => ({
  comment: true,
  [`comment_${id}`]: true,
});

/**
 * Apply a Comment mark to the current editor selection (Pattern A —
 * `editor.tf.addMarks` bypasses the DOM `contenteditable=false` per the Phase
 * 0 spike). Returns the freshly generated id + captured anchor text so the
 * caller can persist the body in its discussion store.
 */
export const applyComment = (editor: PlateEditor): AppliedComment | null => {
  if (editor.selection === null) return null;
  const originalText = editor.api.string(editor.selection);
  if (originalText.length === 0) return null;
  const id = crypto.randomUUID();
  editor.tf.addMarks(commentMarks(id));
  return { id, originalText };
};
