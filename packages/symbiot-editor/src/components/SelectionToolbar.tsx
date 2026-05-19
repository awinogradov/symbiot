import type { ReactNode, RefObject } from "react";

import { useSelectionRect } from "../utils/selectionRect.ts";

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
