import type { ReactNode } from "react";

interface CodeLineElementProps {
  attributes: Record<string, unknown>;
  children: ReactNode;
}

/**
 * Renderer for `code_line` Plate elements — one source line inside a
 * {@link CodeBlockElement}. Rendered as a block-display `<span>` rather than a
 * `<div>`: a `<span>` is phrasing content, so it stays valid markup inside the
 * `<pre><code>` wrapper (a block `<div>` there is invalid nesting), while `block`
 * keeps lines stacked vertically. Carries `data-testid="code-line"` for the
 * Playwright-BDD selector rule (`docs/testing.md#playwright-bdd-selectors`); its
 * text leaves stay selectable so reviewers can annotate code tokens.
 */
export const CodeLineElement = ({
  attributes,
  children,
}: CodeLineElementProps): React.ReactElement => (
  <span {...attributes} data-testid="code-line" className="block">
    {children}
  </span>
);
