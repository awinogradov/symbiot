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
  "--shiki-dark-bg"?: string;
}

/**
 * Code blocks render against the Shiki theme's own background, not the app
 * `--muted`: github-light's syntax colours are tuned for AA contrast against
 * white (`#fff`), and only clear the WCAG-AA gate there — on the slightly darker
 * muted surface the reds drop below 4.5:1. Light values are the defaults; the
 * dark theme rides along as `--shiki-dark*` so the viewer's `html.dark .shiki`
 * rule promotes both colour and background in dark mode. Values mirror the
 * `github-light`/`github-dark` `editor.background` / `editor.foreground`.
 */
const blockStyle: ShikiBlockStyle = {
  color: "#24292e",
  backgroundColor: "#fff",
  "--shiki-dark": "#e1e4e8",
  "--shiki-dark-bg": "#24292e",
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
      className="shiki border-border overflow-x-auto rounded-md border p-3 text-sm"
    >
      <code>{children}</code>
    </pre>
  );
};
