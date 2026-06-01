/**
 * Syntax-highlighting `decorate` for fenced code blocks. Replaces the old
 * Shiki-HTML-via-`dangerouslySetInnerHTML` renderer: instead of an opaque blob,
 * Shiki tokens are projected onto the real `code_line` leaves as ephemeral
 * `code_syntax` decoration ranges, so the code stays selectable and annotatable
 * while still being coloured. Rendered by {@link ../components/CodeSyntaxLeaf.tsx}.
 *
 * Shiki's highlighter loads asynchronously (dynamic grammar/theme imports) but
 * Slate's `decorate` is synchronous. The bridge: tokens are cached per
 * `(lang, code)`; on a miss the decorate returns no ranges and kicks a one-time
 * async tokenize, then calls `editor.api.redecorate()` once the tokens land —
 * a single event-driven re-run, never a `useEffect` state-sync loop (CLAUDE.md
 * §7.4). Once the highlighter is warm, `codeToTokensWithThemes` is synchronous,
 * so subsequent edits colour without a flash.
 *
 * @see ./codeTokens.ts — the pure offset/colour math this wires into Slate.
 */
import {
  createSlatePlugin,
  type Descendant,
  type NodeEntry,
  type SlateEditor,
  type TElement,
  type TNode,
} from "platejs";
import type { ThemedTokenWithVariants } from "shiki/core";

import { type CodeSyntaxRange, lineTokensToSegments, segmentsToLeafRanges } from "./codeTokens.ts";
import { highlightToThemedTokens } from "./shiki.ts";

/** Cap the token cache: editing code mints a fresh `(lang, code)` key on every
 * keystroke, so an unbounded map would grow without limit over a long session. */
const maxCacheEntries = 256;

const tokenCache = new Map<string, ThemedTokenWithVariants[][]>();
/** key → editors awaiting that key's in-flight tokenize, so every editor showing
 * the same code redecorates when tokens land (not just the one that kicked it). */
const pending = new Map<string, Set<SlateEditor>>();

const cacheTokens = (key: string, tokens: ThemedTokenWithVariants[][]): void => {
  tokenCache.set(key, tokens);
  if (tokenCache.size > maxCacheEntries) {
    const oldest = tokenCache.keys().next().value;
    if (oldest !== undefined) tokenCache.delete(oldest);
  }
};

const isCodeBlock = (node: TNode): node is TElement =>
  "type" in node && node.type === "code_block" && Array.isArray(node.children);

const isCodeLine = (node: Descendant): node is TElement =>
  "children" in node && Array.isArray(node.children);

const leafText = (leaf: Descendant): string =>
  "text" in leaf && typeof leaf.text === "string" ? leaf.text : "";

const lineText = (line: TElement): string => line.children.map(leafText).join("");

/** Join a code block's `code_line` children into the source Shiki tokenizes. */
const blockCode = (lines: TElement[]): string => lines.map(lineText).join("\n");

const cacheKey = (lang: string, code: string): string => `${lang} ${code}`;

const blockLang = (block: TElement): string =>
  "lang" in block && typeof block.lang === "string" ? block.lang : "text";

/**
 * Tokenize `code` once and cache it, then re-run decoration so the freshly
 * tokenized block paints. A block decorated repeatedly before its tokens resolve
 * kicks only a single tokenize; editors that ask for the same in-flight key join
 * its wait list so they all redecorate together when the tokens land.
 */
const loadTokens = (editor: SlateEditor, key: string, code: string, lang: string): void => {
  const waiting = pending.get(key);
  if (waiting !== undefined) {
    waiting.add(editor);
    return;
  }
  const waiters = new Set<SlateEditor>([editor]);
  pending.set(key, waiters);
  highlightToThemedTokens(code, lang)
    .then((tokens) => {
      cacheTokens(key, tokens);
      pending.delete(key);
      for (const waiter of waiters) waiter.api.redecorate();
    })
    .catch(() => {
      pending.delete(key);
    });
};

/**
 * Build the decoration ranges for one code block. Returns `[]` (and schedules a
 * tokenize) until the highlighter is warm, so an un-highlighted block renders as
 * plain selectable code rather than blocking.
 */
const decorateCodeBlock = (
  editor: SlateEditor,
  block: TElement,
  blockPath: number[]
): CodeSyntaxRange[] => {
  const lines = block.children.filter(isCodeLine);
  if (lines.length === 0) return [];
  const code = blockCode(lines);
  const lang = blockLang(block);
  const key = cacheKey(lang, code);
  const tokens = tokenCache.get(key);
  if (tokens === undefined) {
    loadTokens(editor, key, code, lang);
    return [];
  }
  const ranges: CodeSyntaxRange[] = [];
  for (const [lineIndex, line] of lines.entries()) {
    const segments = lineTokensToSegments(tokens[lineIndex] ?? []);
    const leafLengths = line.children.map((leaf) => leafText(leaf).length);
    ranges.push(...segmentsToLeafRanges(segments, leafLengths, [...blockPath, lineIndex]));
  }
  return ranges;
};

/**
 * Plate plugin whose `decorate` syntax-highlights `code_block` nodes. Registered
 * alongside the annotation mark plugins so a leaf can carry both a `code_syntax`
 * colour and a reviewer mark — the renderers compose without colliding.
 */
export const CodeSyntaxPlugin = createSlatePlugin({
  key: "code_syntax_decorate",
  decorate: ({ editor, entry }: { editor: SlateEditor; entry: NodeEntry }) => {
    const [node, path] = entry;
    if (!isCodeBlock(node)) return undefined;
    return decorateCodeBlock(editor, node, path);
  },
});
