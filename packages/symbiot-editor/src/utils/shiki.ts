/**
 * Lazily-built dual-themed Shiki highlighter used by the code-block `decorate`
 * to syntax-colour fenced code blocks. The highlighter is instantiated once per
 * page, cached, and shared across every block — language and theme bundles are
 * imported dynamically, and the highlighter runs on Shiki's pure-JS RegExp
 * engine (no Oniguruma WASM) so the initial editor payload stays small.
 *
 * Returns dual-theme TOKENS (not HTML) so the colours land on the real Slate
 * `code_line` leaves as decoration ranges — keeping the code selectable and
 * annotatable — instead of an opaque `dangerouslySetInnerHTML` blob.
 *
 * @example
 *   const tokensByLine = await highlightToThemedTokens(code, lang);
 */
import type { HighlighterCore, ThemedTokenWithVariants } from "shiki/core";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

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
    // Pure-JS RegExp engine instead of the Oniguruma WASM engine: the WASM
    // binary is ~150 KiB brotli of inlined base64 in the single-file bundle and
    // dominates the payload. The JS engine handles every pre-loaded language
    // here; `forgiving` skips any grammar pattern it can't compile rather than
    // throwing, so highlighting degrades gracefully instead of blocking render.
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  });
};

const getHighlighter = async (): Promise<HighlighterCore> => {
  if (cached !== null) return cached;
  if (pending === null) pending = loadHighlighter();
  cached = await pending;
  return cached;
};

/**
 * Tokenize a fenced-code-block body into dual-theme tokens, one array per line.
 * Each token carries `variants.light`/`variants.dark` colours; the WCAG-AA remap
 * of github-light's orange lives in {@link ./codeTokens.ts} alongside the
 * offset math so it stays unit-tested.
 *
 * Pre-loaded languages: bash, ts, tsx, md, js, jsx, json, html, css. Everything
 * else falls through to `text` (no highlighting), so callers always get one
 * token row per source line and never need a failure branch.
 */
export const highlightToThemedTokens = async (
  code: string,
  lang: string
): Promise<ThemedTokenWithVariants[][]> => {
  const highlighter = await getHighlighter();
  const known = highlighter.getLoadedLanguages().includes(lang);
  const effectiveLang = known ? lang : "text";
  return highlighter.codeToTokensWithThemes(code, {
    lang: effectiveLang,
    themes: dualThemes,
  });
};
