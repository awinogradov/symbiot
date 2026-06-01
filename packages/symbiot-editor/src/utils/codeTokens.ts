/**
 * Pure mapping from Shiki dual-theme tokens to per-line color segments, the
 * intermediate the code-block `decorate` turns into Slate decoration ranges.
 *
 * Splitting this out keeps the offset math and the WCAG-AA colour remap
 * testable without a live Shiki highlighter or Plate editor — the async
 * tokenizer ({@link ../utils/shiki.ts}) and the decorate wiring
 * ({@link ../utils/codeSyntax.ts}) consume what this returns.
 *
 * @example
 *   const segments = lineTokensToSegments(tokens[lineIndex]);
 *   // → [{ start: 0, end: 5, light: "#cf222e", dark: "#ff7b72" }, ...]
 */

/** Subset of Shiki's `TokenStyles` this layer reads — the resolved theme colour. */
export interface CodeTokenStyle {
  color?: string;
}

/**
 * Subset of Shiki's `ThemedTokenWithVariants` this layer reads. `variants` is a
 * theme-name → style record (matching Shiki's shape) so a raw Shiki token is
 * assignable without a cast; the `light`/`dark` keys are read by name.
 */
export interface CodeToken {
  content: string;
  variants: Record<string, CodeTokenStyle>;
}

/**
 * One coloured span within a code line: `[start, end)` are character offsets
 * into the line's text leaf; `light`/`dark` are the per-theme colours (null
 * when the token carries no colour, e.g. plain whitespace).
 */
export interface CodeTokenSegment {
  start: number;
  end: number;
  light: string | null;
  dark: string | null;
}

/**
 * github-light ships `#e36209` (orange) at only 3.48:1 against white — below
 * WCAG AA. Remap to Tailwind orange-700 (~5.2:1) so the dual theme stays
 * recognizable while clearing the a11y baseline. Mirrors the `colorReplacements`
 * the previous Shiki-HTML path applied; kept here so the token path keeps the
 * same contrast guarantee.
 */
const lightColorRemap: Record<string, string> = {
  "#e36209": "#c2410c",
  "#E36209": "#c2410c",
};

const remapLight = (color: string | undefined): string | null => {
  if (color === undefined) return null;
  return lightColorRemap[color] ?? color;
};

const lightColor = (token: CodeToken): string | null => remapLight(token.variants["light"]?.color);

const darkColor = (token: CodeToken): string | null => token.variants["dark"]?.color ?? null;

/**
 * Turn one line's Shiki tokens into ordered colour segments. Offsets accumulate
 * across the line so they line up with the `code_line` text leaf; zero-width
 * tokens are dropped so the decorate never emits an empty (Slate-rejected)
 * range.
 */
export const lineTokensToSegments = (lineTokens: CodeToken[]): CodeTokenSegment[] => {
  const segments: CodeTokenSegment[] = [];
  let offset = 0;
  for (const token of lineTokens) {
    const start = offset;
    const end = offset + token.content.length;
    offset = end;
    if (end > start) {
      segments.push({ start, end, light: lightColor(token), dark: darkColor(token) });
    }
  }
  return segments;
};

/** A Slate decoration range carrying the per-token dual-theme colours. */
export interface CodeSyntaxRange {
  anchor: { path: number[]; offset: number };
  focus: { path: number[]; offset: number };
  code_syntax: true;
  codeLight: string | null;
  codeDark: string | null;
}

/**
 * Map line-relative colour segments onto a `code_line`'s leaves, clipping each
 * segment to leaf boundaries. A line is one leaf until an annotation mark splits
 * it; once split, a token can straddle two leaves, so each segment is emitted as
 * one range per overlapping leaf with leaf-relative offsets. This is what lets a
 * comment inside a code block coexist with syntax colour — both decorations land
 * on the correct sub-leaf instead of an out-of-range offset.
 *
 * @param leafLengths - text length of each leaf in the line, in document order
 * @param linePath - path to the `code_line`; leaf paths are `[...linePath, i]`
 */
/** Clip one segment to each overlapping leaf, emitting a range per overlap. */
const clipSegmentToLeaves = (
  segment: CodeTokenSegment,
  leafLengths: number[],
  linePath: number[]
): CodeSyntaxRange[] => {
  const ranges: CodeSyntaxRange[] = [];
  let leafStart = 0;
  for (const [leafIndex, length] of leafLengths.entries()) {
    const leafEnd = leafStart + length;
    const from = Math.max(segment.start, leafStart);
    const to = Math.min(segment.end, leafEnd);
    if (to > from) {
      ranges.push({
        anchor: { path: [...linePath, leafIndex], offset: from - leafStart },
        focus: { path: [...linePath, leafIndex], offset: to - leafStart },
        code_syntax: true,
        codeLight: segment.light,
        codeDark: segment.dark,
      });
    }
    leafStart = leafEnd;
    if (leafStart >= segment.end) break;
  }
  return ranges;
};

export const segmentsToLeafRanges = (
  segments: CodeTokenSegment[],
  leafLengths: number[],
  linePath: number[]
): CodeSyntaxRange[] =>
  segments.flatMap((segment) => clipSegmentToLeaves(segment, leafLengths, linePath));
