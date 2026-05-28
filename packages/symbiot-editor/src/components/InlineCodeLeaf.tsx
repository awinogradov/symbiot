import type { ReactNode } from "react";

interface InlineCodeLeafProps {
  attributes: Record<string, unknown>;
  children: ReactNode;
}

/**
 * Leaf renderer for Plate's inline `code` mark. Renders the same `<code>`
 * Plate's default would produce, with a `data-testid="editor-code-inline"`
 * stamped so BDD specs can distinguish inline `<code>` from fenced
 * `<pre><code>` blocks (which carry `data-testid="code-block"` via
 * `CodeBlockElement`) without falling back to the `p code` descendant
 * selector banned by `docs/testing.md#playwright-bdd-selectors`.
 */
export const InlineCodeLeaf = ({
  attributes,
  children,
}: InlineCodeLeafProps): React.ReactElement => (
  <code {...attributes} data-testid="editor-code-inline">
    {children}
  </code>
);
