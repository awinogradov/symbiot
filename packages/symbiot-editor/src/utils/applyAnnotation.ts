import { TextApi, type TRange } from "platejs";
import type { PlateEditor } from "platejs/react";

import { type AnnotationKind, prefixOf } from "./annotationKind.ts";
import { setPendingHighlight, type PendingHighlightKind } from "./pendingHighlight.ts";

export type { AnnotationKind };

/** Identifier + captured anchor text returned after applying a mark to the selection. */
export interface AppliedAnnotation {
  id: string;
  anchorText: string;
}

/** {@link AppliedAnnotation} plus the selection the pending decoration covers. */
export interface PendingAppliedAnnotation extends AppliedAnnotation {
  /** Unhung selection range; {@link materializeAnnotation} writes the marks here on save. */
  range: TRange;
}

/**
 * True when the editor has a non-empty text selection that {@link applyAnnotation}
 * would accept. Shared with hotkey handlers so they can short-circuit identically
 * to a toolbar click.
 */
export const hasValidSelection = (editor: PlateEditor): boolean => {
  if (editor.selection === null) return false;
  return editor.api.string(editor.selection).length > 0;
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

/**
 * Begin a composer-backed annotation WITHOUT touching the model: capture the
 * selection and project the eager highlight as a pending decoration (see
 * `./pendingHighlight.ts`). Cancelling then only clears view state — the
 * stored-mark removal that slate-react drops on a blurred read-only editable
 * under CI load (symbiot#236) never happens. The range is unhung so a
 * triple-click selection cannot decorate (or later mark) a block boundary the
 * reviewer never selected.
 */
export const capturePendingAnnotation = (
  editor: PlateEditor,
  kind: PendingHighlightKind
): PendingAppliedAnnotation | null => {
  if (editor.selection === null) return null;
  const anchorText = editor.api.string(editor.selection);
  if (anchorText.length === 0) return null;
  const id = crypto.randomUUID();
  const range = editor.api.unhangRange(editor.selection);
  setPendingHighlight(editor, { kind, id, range });
  return { id, anchorText, range };
};

/**
 * Write the stored annotation mark pair at a captured range on composer save,
 * converting the pending decoration into the persisted Pattern-A wire format
 * ({@link applyAnnotation} parity — `walkAnnotations` and drift detection see
 * the same marks either way). Clear the pending decoration BEFORE calling
 * this: `split: true` rewrites leaf boundaries the stored range points into.
 */
export const materializeAnnotation = (
  editor: PlateEditor,
  kind: PendingHighlightKind,
  id: string,
  range: TRange
): void => {
  const prefix = prefixOf(kind);
  editor.tf.setNodes(
    { [prefix]: true, [`${prefix}_${id}`]: true },
    { at: range, match: (node) => TextApi.isText(node), split: true }
  );
};
