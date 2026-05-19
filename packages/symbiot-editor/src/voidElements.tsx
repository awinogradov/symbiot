import type { ReactNode } from "react";

interface VoidElementProps {
  attributes: Record<string, unknown>;
  children: ReactNode;
}

/**
 * Renderer for Plate void elements like `<hr>` that can't accept children in
 * HTML. Slate-React always passes a zero-width text node as `children` for
 * every void element; React 19 rejects this when the rendered tag is a void
 * HTML element (e.g. `<hr>`). Wrap the void tag in a block element and place
 * the hidden Slate children alongside it.
 */
export const HrElement = ({ attributes, children }: VoidElementProps): React.ReactElement => (
  <div {...attributes} contentEditable={false} className="my-6">
    <hr className="border-border border-t" />
    <span className="hidden">{children}</span>
  </div>
);
