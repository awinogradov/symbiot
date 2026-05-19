import { useEditorRef, useEditorSelection } from "platejs/react";
import { useMemo, type MouseEvent, type ReactNode } from "react";
import { Popover, PopoverAnchor, PopoverContent } from "@symbiot/ui/components/Popover";

import { selectionRect, type Rect } from "../utils/selectionRect.ts";

interface FloatingToolbarProps {
  children: ReactNode;
}

/**
 * Mousedown handler that prevents the browser from collapsing the text
 * selection when the user clicks a toolbar button. Without this, clicking
 * "Comment" steals focus, Plate's selection observer fires, and the click
 * handler ends up with a null/collapsed `editor.selection`.
 */
export const preserveSelection = (event: MouseEvent): void => {
  event.preventDefault();
};

// Off-screen rect used while the selection is collapsed. The Popover stays
// mounted so Radix has a stable anchor reference; opacity 0 hides it.
const offscreen: Rect = { top: -9999, left: -9999, width: 0, height: 0 };

/**
 * Floating toolbar anchored to Plate's `editor.selection` via a virtual
 * `<PopoverAnchor>`. Shadcn Popover handles flip / shift / collision detection
 * via Floating UI; we just position a 0-sized anchor at the selection rect.
 */
export const FloatingToolbar = ({ children }: FloatingToolbarProps): React.ReactElement => {
  const editor = useEditorRef();
  const selection = useEditorSelection();
  const rect = useMemo(() => {
    if (selection === null) return null;
    return selectionRect(editor);
  }, [editor, selection]);

  const anchorRect = rect ?? offscreen;
  const open = rect !== null;

  return (
    <Popover open={open}>
      <PopoverAnchor asChild>
        <div
          data-testid="floating-toolbar-anchor"
          style={{
            position: "fixed",
            top: anchorRect.top - window.scrollY,
            left: anchorRect.left - window.scrollX,
            width: anchorRect.width,
            height: anchorRect.height,
            pointerEvents: "none",
          }}
        />
      </PopoverAnchor>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onMouseDown={preserveSelection}
        className="flex w-auto items-center gap-1 p-1"
      >
        {children}
      </PopoverContent>
    </Popover>
  );
};
