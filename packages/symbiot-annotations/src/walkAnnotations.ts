import { resolveAnchor } from "./dualAnchor.ts";
import type {
  AnnotationEntry,
  BlockLines,
  CommentEntry,
  DeletionEntry,
  GlobalCommentEntry,
  PlateNode,
  PlateTextLeaf,
  PlateValue,
} from "./types.ts";

const commentIdPrefix = "comment_";
const suggestionIdPrefix = "suggestion_";
const blockLinesMark = "__symbiotBlockLines";

const isText = (node: PlateNode): node is PlateTextLeaf =>
  typeof (node as PlateTextLeaf).text === "string";

const markIdsOf = (leaf: PlateTextLeaf, prefix: string): string[] => {
  const ids: string[] = [];
  for (const key of Object.keys(leaf)) {
    if (key.startsWith(prefix) && leaf[key] === true) {
      ids.push(key.slice(prefix.length));
    }
  }
  return ids;
};

interface LeafWithLines {
  leaf: PlateTextLeaf;
  lines: BlockLines | undefined;
  /** Top-level block index this leaf descends from. Used as `pathAnchor` for drift resolution. */
  topIndex: number;
}

const isBlockLines = (raw: unknown): raw is BlockLines => {
  if (raw === null || typeof raw !== "object") return false;
  const c = raw as Partial<BlockLines>;
  return typeof c.startLine === "number" && typeof c.endLine === "number";
};

const readBlockLines = (node: PlateNode | undefined): BlockLines | undefined => {
  if (node === undefined) return undefined;
  const raw = (node as Record<string, unknown>)[blockLinesMark];
  return isBlockLines(raw) ? { startLine: raw.startLine, endLine: raw.endLine } : undefined;
};

const collectLeavesWithLines = (value: PlateValue): LeafWithLines[] => {
  const out: LeafWithLines[] = [];
  for (let topIndex = 0; topIndex < value.length; topIndex += 1) {
    const top = value[topIndex] as PlateNode;
    const lines = readBlockLines(top);
    const visit = (node: PlateNode): void => {
      if (isText(node)) {
        out.push({ leaf: node, lines, topIndex });
        return;
      }
      for (const child of node.children) visit(child);
    };
    visit(top);
  }
  return out;
};

const earliestLines = (
  prev: BlockLines | undefined,
  next: BlockLines | undefined
): BlockLines | undefined => {
  if (prev === undefined) return next;
  if (next === undefined) return prev;
  if (next.startLine < prev.startLine) return next;
  return prev;
};

interface Fragment {
  text: string;
  lines: BlockLines | undefined;
  /** Top-level block index of the first leaf in the fragment. Used for drift resolution. */
  topIndex: number;
}

const mergeFragment = (
  existing: Fragment | undefined,
  leaf: PlateTextLeaf,
  lines: BlockLines | undefined,
  topIndex: number
): Fragment => {
  if (existing === undefined) return { text: leaf.text, lines, topIndex };
  return {
    text: existing.text + leaf.text,
    lines: earliestLines(existing.lines, lines),
    topIndex: existing.topIndex,
  };
};

const groupContiguous = (entries: LeafWithLines[], prefix: string): Map<string, Fragment> => {
  const out = new Map<string, Fragment>();
  for (const { leaf, lines, topIndex } of entries) {
    for (const id of markIdsOf(leaf, prefix)) {
      out.set(id, mergeFragment(out.get(id), leaf, lines, topIndex));
    }
  }
  return out;
};

/**
 * Compare a fragment's live text against the captured `originalText` and
 * decide drift. Returns the text to surface (always the stored snapshot so
 * the sidebar shows what the reviewer actually commented on) plus `drifted`
 * iff the snapshot can't be located in the current value via `resolveAnchor`.
 */
const detectDrift = (
  stored: string,
  fragment: Fragment,
  value: PlateValue
): { originalText: string; drifted: boolean } => {
  if (stored === fragment.text) return { originalText: stored, drifted: false };
  const resolution = resolveAnchor(value, {
    pathAnchor: [fragment.topIndex],
    originalText: stored,
  });
  return { originalText: stored, drifted: resolution.strategy === "missing" };
};

/** Inputs collected by the editor / app for a single walk. */
export interface AnnotationSources {
  value: PlateValue;
  commentBodies: Map<string, string>;
  /** Optional per-comment image refs (`${uuid}${ext}` strings), parallel to `commentBodies`. */
  commentImages?: Map<string, string[]>;
  globalComments: GlobalCommentEntry[];
  /**
   * Per-comment snapshot of the anchored text captured at creation time.
   * When supplied, the walker compares each fragment's live text against the
   * snapshot and sets `drifted: true` on entries the dual-anchor resolver
   * can no longer locate. Absent → walker behaves as before (no drift signal,
   * `originalText` reconstructed from live leaves). Phase 4.3.
   */
  commentOriginalTexts?: Map<string, string>;
  /** Per-deletion `originalText` snapshot. Parallel to `commentOriginalTexts`. */
  suggestionOriginalTexts?: Map<string, string>;
}

interface CommentParts {
  id: string;
  fragment: Fragment;
  body: string | undefined;
  images: string[] | undefined;
  /** Result of {@link detectDrift} when a sidecar map is present, otherwise undefined. */
  drift: { originalText: string; drifted: boolean } | undefined;
}

const nonEmpty = <T extends { length: number }>(value: T | undefined): value is T => {
  if (value === undefined) return false;
  return value.length > 0;
};

const decorateLines = (entry: { kind: "comment" } & CommentEntry, fragment: Fragment): void => {
  if (fragment.lines === undefined) return;
  entry.lines = fragment.lines;
};

const decorateImages = (
  entry: { kind: "comment" } & CommentEntry,
  images: string[] | undefined
): void => {
  if (!nonEmpty(images)) return;
  entry.images = images;
};

const decorateDrift = (
  entry: ({ kind: "comment" } & CommentEntry) | ({ kind: "deletion" } & DeletionEntry),
  drift: { originalText: string; drifted: boolean } | undefined
): void => {
  if (drift?.drifted !== true) return;
  entry.drifted = true;
};

const resolveDrift = (
  id: string,
  fragment: Fragment,
  originalTexts: Map<string, string> | undefined,
  value: PlateValue
): { originalText: string; drifted: boolean } | undefined => {
  const stored = originalTexts?.get(id);
  if (stored === undefined) return undefined;
  return detectDrift(stored, fragment, value);
};

const hasCommentContent = (body: string | undefined, images: string[] | undefined): boolean =>
  nonEmpty(body) || nonEmpty(images);

const anchorTextOf = (
  fragment: Fragment,
  drift: { originalText: string; drifted: boolean } | undefined
): string => drift?.originalText ?? fragment.text;

const buildCommentEntry = ({
  id,
  fragment,
  body,
  images,
  drift,
}: CommentParts): ({ kind: "comment" } & CommentEntry) | null => {
  if (!hasCommentContent(body, images)) return null;
  const entry: { kind: "comment" } & CommentEntry = {
    kind: "comment",
    id,
    originalText: anchorTextOf(fragment, drift),
    body: body ?? "",
  };
  decorateLines(entry, fragment);
  decorateImages(entry, images);
  decorateDrift(entry, drift);
  return entry;
};

const walkCommentEntries = (
  entries: LeafWithLines[],
  bodies: Map<string, string>,
  imagesByCommentId: Map<string, string[]> | undefined,
  originalTexts: Map<string, string> | undefined,
  value: PlateValue
): AnnotationEntry[] => {
  const out: AnnotationEntry[] = [];
  for (const [id, fragment] of groupContiguous(entries, commentIdPrefix)) {
    const entry = buildCommentEntry({
      id,
      fragment,
      body: bodies.get(id),
      images: imagesByCommentId?.get(id),
      drift: resolveDrift(id, fragment, originalTexts, value),
    });
    if (entry !== null) out.push(entry);
  }
  return out;
};

const buildDeletionEntry = (
  id: string,
  fragment: Fragment,
  drift: { originalText: string; drifted: boolean } | undefined
): { kind: "deletion" } & DeletionEntry => {
  const entry: { kind: "deletion" } & DeletionEntry = {
    kind: "deletion",
    id,
    originalText: anchorTextOf(fragment, drift),
  };
  if (fragment.lines !== undefined) entry.lines = fragment.lines;
  decorateDrift(entry, drift);
  return entry;
};

const walkDeletionEntries = (
  entries: LeafWithLines[],
  originalTexts: Map<string, string> | undefined,
  value: PlateValue
): AnnotationEntry[] => {
  const out: AnnotationEntry[] = [];
  for (const [id, fragment] of groupContiguous(entries, suggestionIdPrefix)) {
    out.push(buildDeletionEntry(id, fragment, resolveDrift(id, fragment, originalTexts, value)));
  }
  return out;
};

const walkGlobalEntries = (globals: GlobalCommentEntry[]): AnnotationEntry[] =>
  globals.map((g) => ({ kind: "global", ...g }));

/**
 * Walk a Plate value and surface every annotation (Comment + Deletion) plus
 * app-level Global Comments. Each per-anchor entry carries the `BlockLines`
 * range of its enclosing top-level block when the value was stamped by
 * `SourceLinesPlugin` / `stampBlockLines`, so `serializeFeedback` can emit the
 * `(lines N–M)` prefix.
 */
export const walkAnnotations = (sources: AnnotationSources): AnnotationEntry[] => {
  const entries = collectLeavesWithLines(sources.value);
  return [
    ...walkCommentEntries(
      entries,
      sources.commentBodies,
      sources.commentImages,
      sources.commentOriginalTexts,
      sources.value
    ),
    ...walkDeletionEntries(entries, sources.suggestionOriginalTexts, sources.value),
    ...walkGlobalEntries(sources.globalComments),
  ];
};

const stripCommentKind = (e: { kind: "comment" } & CommentEntry): CommentEntry => ({
  id: e.id,
  originalText: e.originalText,
  body: e.body,
  ...(e.author === undefined ? {} : { author: e.author }),
  ...(e.images === undefined ? {} : { images: e.images }),
  ...(e.lines === undefined ? {} : { lines: e.lines }),
  ...(e.drifted === undefined ? {} : { drifted: e.drifted }),
});

const stripDeletionKind = (e: { kind: "deletion" } & DeletionEntry): DeletionEntry => ({
  id: e.id,
  originalText: e.originalText,
  ...(e.author === undefined ? {} : { author: e.author }),
  ...(e.images === undefined ? {} : { images: e.images }),
  ...(e.lines === undefined ? {} : { lines: e.lines }),
  ...(e.drifted === undefined ? {} : { drifted: e.drifted }),
});

const stripGlobalKind = (e: { kind: "global" } & GlobalCommentEntry): GlobalCommentEntry => ({
  id: e.id,
  body: e.body,
  ...(e.author === undefined ? {} : { author: e.author }),
  ...(e.images === undefined ? {} : { images: e.images }),
});

/** Filter a walk to comments only (Phase 2 backwards-compat). */
export const onlyComments = (entries: AnnotationEntry[]): CommentEntry[] =>
  entries.filter((e) => e.kind === "comment").map(stripCommentKind);

/** Filter a walk to deletions only. */
export const onlyDeletions = (entries: AnnotationEntry[]): DeletionEntry[] =>
  entries.filter((e) => e.kind === "deletion").map(stripDeletionKind);

/** Filter a walk to global comments only. */
export const onlyGlobals = (entries: AnnotationEntry[]): GlobalCommentEntry[] =>
  entries.filter((e) => e.kind === "global").map(stripGlobalKind);
