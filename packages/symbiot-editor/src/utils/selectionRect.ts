import type { PlateEditor } from "platejs/react";

/** Document-space bounding rect for the editor's current selection. */
export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Document-space rect for the editor's current selection, or null when there
 * is nothing to anchor a floating toolbar to. Returns null when the selection
 * is missing, collapsed (caret only — a click without drag), outside the DOM,
 * or has zero size.
 */
const measurable = (r: DOMRect | undefined): r is DOMRect =>
  r !== undefined && (r.width !== 0 || r.height !== 0);

export const selectionRect = (editor: PlateEditor): Rect | null => {
  if (editor.selection === null || editor.api.isCollapsed()) return null;
  const r = editor.api.toDOMRange(editor.selection)?.getBoundingClientRect();
  if (!measurable(r)) return null;
  return {
    top: r.top + window.scrollY,
    left: r.left + window.scrollX,
    width: r.width,
    height: r.height,
  };
};
