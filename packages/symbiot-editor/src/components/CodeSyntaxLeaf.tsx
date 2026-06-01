import { createPlatePlugin } from "platejs/react";
import type { CSSProperties, ReactNode } from "react";

/** Leaf props carrying the dual-theme colours stamped by the code-syntax decorate. */
interface CodeSyntaxLeafProps {
  attributes: Record<string, unknown>;
  children: ReactNode;
  leaf: {
    codeLight?: string | null;
    codeDark?: string | null;
  };
}

/** `CSSProperties` plus the `--shiki-dark` custom property React's type omits. */
interface TokenStyle extends CSSProperties {
  "--shiki-dark"?: string;
}

/**
 * Build the inline style for a syntax token. The light colour is the rendered
 * `color`; the dark colour rides along as the `--shiki-dark` custom property so
 * the existing `html.dark .shiki span` rule (see the viewer `styles.css`) can
 * promote it in dark mode — the same dual-theme contract Shiki's own HTML used.
 */
const tokenStyle = (
  light: string | null | undefined,
  dark: string | null | undefined
): TokenStyle => ({
  color: light ?? undefined,
  "--shiki-dark": dark ?? undefined,
});

/**
 * Leaf renderer for the `code_syntax` decoration emitted per Shiki token. Wraps
 * the token text in a `<span>` carrying the dual-theme colours. Renders inside
 * the `.shiki` code block, so it composes under any annotation leaf (`<mark>`,
 * `<s>`, `<ins>`) — those use non-`span` tags, so the `.shiki span` dark-mode
 * rule never touches them and syntax colour + annotation highlight coexist.
 */
export const CodeSyntaxLeaf = ({
  attributes,
  children,
  leaf,
}: CodeSyntaxLeafProps): React.ReactElement => (
  <span {...attributes} style={tokenStyle(leaf.codeLight, leaf.codeDark)}>
    {children}
  </span>
);

CodeSyntaxLeaf.displayName = "CodeSyntaxLeaf";

/**
 * Plate plugin that renders any leaf carrying the `code_syntax` decoration mark
 * via {@link CodeSyntaxLeaf}. The mark is ephemeral (added by the decorate, never
 * persisted), so it never participates in markdown round-trip.
 */
export const CodeSyntaxLeafPlugin = createPlatePlugin({
  key: "code_syntax",
  node: { isLeaf: true },
}).withComponent(CodeSyntaxLeaf);
