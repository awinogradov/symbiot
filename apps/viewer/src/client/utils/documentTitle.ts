/**
 * @module documentTitle
 *
 * Pure helpers for composing the viewer's browser tab title from the reviewed
 * plan. Kept side-effect-free so they unit-test without a DOM; the
 * `useDocumentTitle` hook owns the actual `document.title` write.
 *
 * @example
 * const title = buildDocumentTitle("acme · main", firstMarkdownHeading(plan));
 * // "Symbiot · acme · main — Add authentication"  (when the plan has an H1)
 * // "Symbiot · acme · main"                        (when it does not)
 */

/** Matches a single-level ATX H1 (`# Title`) and captures its trimmed text. */
const h1Pattern = /^#\s+(.+?)\s*$/;

/**
 * Return the text of the first H1 in `markdown`, or `null` when there is none.
 *
 * Intentionally H1-specific — stricter than `server/storage.ts`'s any-level
 * `firstHeading` (which exists only to derive slugs). This is a deliberately
 * simple line scanner: it does not track fenced code blocks (a `# …` line
 * inside a ``` fence is matched) and does not strip a closing `#`. That is
 * accepted for the tab title; do not grow it into a markdown parser.
 */
export const firstMarkdownHeading = (markdown: string): string | null => {
  for (const line of markdown.split("\n")) {
    const match = h1Pattern.exec(line);
    if (match?.[1]) return match[1];
  }
  return null;
};

/**
 * Compose the tab title: `Symbiot · {displayName}` mirrors the TopBar context,
 * with ` — {planTitle}` appended when the plan has an H1. Drops the ` · `
 * separator (and any dangle) when `displayName` is empty/whitespace.
 */
export const buildDocumentTitle = (displayName: string, planTitle: string | null): string => {
  const project = displayName.trim();
  const base = project.length > 0 ? `Symbiot · ${project}` : "Symbiot";
  return planTitle ? `${base} — ${planTitle}` : base;
};
