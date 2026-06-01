import type { ReactNode } from "react";

interface CodeLineElementProps {
  attributes: Record<string, unknown>;
  children: ReactNode;
}

/**
 * Renderer for `code_line` Plate elements — one source line inside a
 * {@link CodeBlockElement}. Rendered as a block `<div>` so lines stack
 * vertically inside the `<pre>`, and carries `data-testid="code-line"` for the
 * Playwright-BDD selector rule (`docs/testing.md#playwright-bdd-selectors`).
 * Its text leaves stay selectable so reviewers can annotate code tokens.
 */
export const CodeLineElement = ({
  attributes,
  children,
}: CodeLineElementProps): React.ReactElement => (
  <div {...attributes} data-testid="code-line">
    {children}
  </div>
);
