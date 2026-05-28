import type { ReactNode } from "react";

interface ParagraphElementProps {
  attributes: Record<string, unknown>;
  children: ReactNode;
}

/**
 * Renderer for Plate paragraph nodes. Replaces the previous
 * `ParagraphPlugin.configure({ render: { as: "p" } })` wiring so every paragraph
 * exposes a stable `data-testid="editor-paragraph"` selector for BDD specs —
 * the rule banning framework-internal attributes like `data-slate-*` is
 * documented in `docs/testing.md#playwright-bdd-selectors`.
 *
 * The Plate `attributes` (carrying `data-slate-node="element"`, refs, and other
 * Slate-internal props) are spread first so the hardcoded `data-testid` wins
 * over any incoming value.
 */
export const ParagraphElement = ({
  attributes,
  children,
}: ParagraphElementProps): React.ReactElement => (
  <p {...attributes} data-testid="editor-paragraph">
    {children}
  </p>
);
