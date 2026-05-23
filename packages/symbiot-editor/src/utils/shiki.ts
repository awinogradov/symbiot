/**
 * Lazily-built dual-themed Shiki highlighter used by `CodeBlockElement` to
 * render fenced code blocks. The highlighter is instantiated once per page,
 * cached, and shared across every block — language and theme bundles are
 * imported dynamically so the initial editor payload stays small.
 *
 * @example
 *   const html = await highlightToHtml(code, lang);
 */
import type { HighlighterCore } from "shiki/core";
import { createHighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";

const dualThemes = { light: "github-light", dark: "github-dark" } as const;

let cached: HighlighterCore | null = null;
let pending: Promise<HighlighterCore> | null = null;

const loadHighlighter = async (): Promise<HighlighterCore> => {
  const [light, dark, bash, ts, tsx, md, js, jsx, json, html, css] = await Promise.all([
    import("shiki/themes/github-light.mjs"),
    import("shiki/themes/github-dark.mjs"),
    import("shiki/langs/bash.mjs"),
    import("shiki/langs/ts.mjs"),
    import("shiki/langs/tsx.mjs"),
    import("shiki/langs/md.mjs"),
    import("shiki/langs/js.mjs"),
    import("shiki/langs/jsx.mjs"),
    import("shiki/langs/json.mjs"),
    import("shiki/langs/html.mjs"),
    import("shiki/langs/css.mjs"),
  ]);
  return createHighlighterCore({
    themes: [light.default, dark.default],
    langs: [bash, ts, tsx, md, js, jsx, json, html, css].map((m) => m.default),
    engine: createOnigurumaEngine(import("shiki/wasm")),
  });
};

const getHighlighter = async (): Promise<HighlighterCore> => {
  if (cached !== null) return cached;
  if (pending === null) pending = loadHighlighter();
  cached = await pending;
  return cached;
};

/**
 * Highlight a fenced-code-block body to dual-themed HTML. Returns `null` for
 * unknown languages — the CodeBlockElement caller renders a plain `<pre><code>`
 * fallback so highlighting failure never blocks plan rendering.
 *
 * Pre-loaded languages: bash, ts, tsx, md, js, jsx, json, html, css. Everything
 * else falls through to `text` (no highlighting).
 */
// github-light ships #e36209 (orange) for `entity.name.type` etc. — only 3.48:1
// against white, below WCAG AA. Remap to #c2410c (Tailwind orange-700, ~5.2:1)
// so the dual-theme remains recognizable while clearing the a11y baseline.
const colorReplacements = {
  "github-light": {
    "#e36209": "#c2410c",
    "#E36209": "#c2410c",
  },
} as const;

export const highlightToHtml = async (code: string, lang: string): Promise<string | null> => {
  const highlighter = await getHighlighter();
  const known = highlighter.getLoadedLanguages().includes(lang);
  const effectiveLang = known ? lang : "text";
  return highlighter.codeToHtml(code, {
    lang: effectiveLang,
    themes: dualThemes,
    colorReplacements,
  });
};
