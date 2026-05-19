import { useEffect, useState, type RefObject } from "react";

/** Document-space bounding rect for a DOM selection. */
export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const selectionInside = (container: HTMLElement): Selection | null => {
  const sel = window.getSelection();
  if (sel === null || sel.isCollapsed || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  return container.contains(range.commonAncestorContainer) ? sel : null;
};

const rectOf = (selection: Selection): Rect | null => {
  const r = selection.getRangeAt(0).getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return {
    top: r.top + window.scrollY,
    left: r.left + window.scrollX,
    width: r.width,
    height: r.height,
  };
};

/**
 * Track the bounding rect of the current DOM selection inside a container.
 * Returns null when there's no selection or the selection is outside the
 * container. Updates via the `selectionchange` event.
 */
export const useSelectionRect = (containerRef: RefObject<HTMLElement | null>): Rect | null => {
  const [rect, setRect] = useState<Rect | null>(null);
  useEffect(() => {
    const node = containerRef.current;
    if (node === null) return;
    const update = (): void => {
      const sel = selectionInside(node);
      setRect(sel === null ? null : rectOf(sel));
    };
    document.addEventListener("selectionchange", update);
    return () => document.removeEventListener("selectionchange", update);
  }, [containerRef]);
  return rect;
};
