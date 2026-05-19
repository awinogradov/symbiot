import { useEditorRef, useEditorSelection } from "platejs/react";
import { useMemo, type MouseEvent, type ReactNode } from "react";

import { selectionRect } from "../utils/selectionRect.ts";

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

/**
 * Floating toolbar that tracks Plate's `editor.selection` (works in read-only
 * mode — Pattern A applies marks via `editor.tf.addMarks` which bypasses
 * contenteditable=false). Hidden while the selection is collapsed so the
 * toolbar only appears once the reviewer has actually highlighted text.
 */
export const FloatingToolbar = ({ children }: FloatingToolbarProps): React.ReactElement | null => {
  const editor = useEditorRef();
  const selection = useEditorSelection();
  const rect = useMemo(() => {
    if (selection === null) return null;
    return selectionRect(editor);
  }, [editor, selection]);

  if (rect === null) return null;
  const style: React.CSSProperties = {
    position: "absolute",
    top: Math.max(0, rect.top - 44),
    left: rect.left + rect.width / 2,
    transform: "translateX(-50%)",
    zIndex: 40,
  };
  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- mousedown intercept guards the editor selection from being collapsed by the click; the interactive controls are the children (buttons).
    <div
      style={style}
      onMouseDown={preserveSelection}
      className="border-border bg-popover rounded-md border px-2 py-1 shadow-md"
    >
      {children}
    </div>
  );
};
