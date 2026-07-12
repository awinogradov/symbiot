/**
 * Ephemeral decoration for the PENDING (pre-save) annotation highlight.
 *
 * Pattern A used to apply the eager highlight as a stored mark and remove it
 * again on cancel — but slate-react intermittently drops the removal reconcile
 * into a blurred, read-only editable under CI load (symbiot#236: `modelClean:
 * true, domCount: 1` on the overlay-dismiss route). The pending highlight is
 * therefore never written to `editor.children`: it lives in a per-editor store
 * and is projected onto the text leaves as decoration ranges, exactly like the
 * `code_syntax` colours ({@link ./codeSyntax.ts}). Cancel clears the store and
 * redecorates — a pure view-state change with no model mutation to reconcile.
 * Save materializes the real stored marks at the captured range, so SAVED
 * annotations keep the Pattern-A wire format (`walkAnnotations`, serialization,
 * and drift detection are untouched).
 *
 * The stamped props reuse the annotation mark pair (`{[prefix]: true,
 * [`${prefix}_<id>`]: true}`), so the existing leaf plugins render the pending
 * highlight with the same `data-testid="annotation-<kind>"` DOM as a saved one.
 *
 * @example
 *   setPendingHighlight(editor, { kind: "comment", id, range });
 *   // …composer cancelled:
 *   clearPendingHighlight(editor);
 */
import {
  createSlatePlugin,
  RangeApi,
  TextApi,
  type NodeEntry,
  type SlateEditor,
  type TRange,
} from "platejs";

import { prefixOf } from "./annotationKind.ts";

/** Annotation kinds that pend in the composer before saving (deletion never pends). */
export type PendingHighlightKind = "comment" | "insertion" | "replacement";

/** One in-flight composer highlight: which kind/id to stamp over which range. */
export interface PendingHighlight {
  kind: PendingHighlightKind;
  id: string;
  range: TRange;
}

/** Decoration range carrying the annotation mark pair for the pending id. */
export type PendingHighlightRange = TRange & Record<string, unknown>;

const pendingByEditor = new WeakMap<SlateEditor, PendingHighlight>();

/** Start decorating `pending.range`; repaints via `redecorate` (works on blurred read-only editors). */
export const setPendingHighlight = (editor: SlateEditor, pending: PendingHighlight): void => {
  pendingByEditor.set(editor, pending);
  editor.api.redecorate();
};

/** Stop decorating and repaint. No-op (no repaint) when nothing is pending. */
export const clearPendingHighlight = (editor: SlateEditor): void => {
  if (!pendingByEditor.has(editor)) return;
  pendingByEditor.delete(editor);
  editor.api.redecorate();
};

/**
 * Decoration ranges for one node entry: the intersection of the pending range
 * with the entry's own text range, stamped with the annotation mark pair.
 * Intersecting with the entry's bounds clamps every emitted offset into the
 * live text node, so a stored range can never yield a slate-react-invalid
 * range; collapsed intersections (hanging-range boundaries) are skipped.
 */
export const decoratePendingHighlight = (
  editor: SlateEditor,
  entry: NodeEntry
): PendingHighlightRange[] | undefined => {
  const pending = pendingByEditor.get(editor);
  if (pending === undefined) return undefined;
  const [node, path] = entry;
  if (!TextApi.isText(node)) return undefined;
  const intersection = RangeApi.intersection(pending.range, {
    anchor: { path, offset: 0 },
    focus: { path, offset: node.text.length },
  });
  if (intersection === null || RangeApi.isCollapsed(intersection)) return undefined;
  const prefix = prefixOf(pending.kind);
  return [{ ...intersection, [prefix]: true, [`${prefix}_${pending.id}`]: true }];
};

/**
 * Plate plugin projecting the pending composer highlight as decorations.
 * Registered in `SymbiotEditorKit` only — the diff viewer never authors.
 */
export const PendingHighlightPlugin = createSlatePlugin({
  key: "pending_highlight_decorate",
  decorate: ({ editor, entry }: { editor: SlateEditor; entry: NodeEntry }) =>
    decoratePendingHighlight(editor, entry),
});
