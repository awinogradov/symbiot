/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- the one tabIndex below makes the
   horizontally-scrollable code region keyboard-focusable, which axe
   (scrollable-region-focusable) requires; the two a11y linters disagree here. */
import type { CSSProperties, ReactNode } from "react";

interface CodeBlockNode {
  lang?: string;
}

interface CodeBlockElementProps {
  attributes: Record<string, unknown>;
  children: ReactNode;
  element: CodeBlockNode;
}

/** `CSSProperties` plus the dual-theme custom properties React's type omits. */
interface ShikiBlockStyle extends CSSProperties {
  "--shiki-dark"?: string;
}

/**
 * Code blocks render transparent against the page `--background`: white in
 * light (where github-light's syntax colours are AA-tuned) and the darker
 * GitHub-dark canvas in dark (darker than the `#24292e` github-dark was tuned
 * for, so ratios only improve). Light foreground is the default; the dark
 * theme rides along as `--shiki-dark` so the viewer's `html.dark .shiki` rule
 * promotes the colour in dark mode. Values mirror the `github-light` /
 * `github-dark` `editor.foreground`.
 */
const blockStyle: ShikiBlockStyle = {
  color: "#24292e",
  "--shiki-dark": "#e1e4e8",
};

/**
 * Renderer for `code_block` Plate elements. Renders the real Slate `code_line`
 * children as selectable text inside a `<pre class="shiki">` — the code is the
 * live editor model, not an opaque Shiki HTML blob, so a reviewer can select a
 * token and annotate it like any prose. Syntax colours arrive as ephemeral
 * `code_syntax` decorations on those leaves (see `../utils/codeSyntax.ts`).
 * `tabIndex` keeps the horizontally-scrollable region keyboard-reachable, which
 * axe (`scrollable-region-focusable`) requires (see the file-level disable above).
 */
export const CodeBlockElement = ({
  attributes,
  children,
  element,
}: CodeBlockElementProps): React.ReactElement => {
  const lang = element.lang ?? "text";
  return (
    <pre
      tabIndex={0}
      {...attributes}
      data-testid="code-block"
      data-lang={lang}
      style={blockStyle}
      className="shiki overflow-x-auto py-3 pr-3 pl-0 text-sm"
    >
      <code>{children}</code>
    </pre>
  );
};
