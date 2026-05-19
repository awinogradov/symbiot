import { useEffect, useState, type ReactNode, type RefObject } from "react";

interface Rect {
  top: number;
  left: number;
  width: number;
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
  return { top: r.top + window.scrollY, left: r.left + window.scrollX, width: r.width };
};

const useSelectionRect = (containerRef: RefObject<HTMLElement | null>): Rect | null => {
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

interface SelectionToolbarProps {
  containerRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}

/**
 * Floating toolbar that tracks the current DOM selection. Works against
 * `contenteditable=false` content (where Plate's own FloatingToolbar may not
 * fire) — see plans/00-spike.md "What still needs verifying".
 */
export const SelectionToolbar = ({
  containerRef,
  children,
}: SelectionToolbarProps): React.ReactElement | null => {
  const rect = useSelectionRect(containerRef);
  if (rect === null) return null;
  const style: React.CSSProperties = {
    position: "absolute",
    top: Math.max(0, rect.top - 44),
    left: rect.left + rect.width / 2,
    transform: "translateX(-50%)",
    zIndex: 40,
  };
  return (
    <div style={style} className="border-border bg-popover rounded-md border px-2 py-1 shadow-md">
      {children}
    </div>
  );
};
