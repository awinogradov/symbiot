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
  for (const top of value) {
    const lines = readBlockLines(top);
    const visit = (node: PlateNode): void => {
      if (isText(node)) {
        out.push({ leaf: node, lines });
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
}

const mergeFragment = (
  existing: Fragment | undefined,
  leaf: PlateTextLeaf,
  lines: BlockLines | undefined
): Fragment => {
  if (existing === undefined) return { text: leaf.text, lines };
  return { text: existing.text + leaf.text, lines: earliestLines(existing.lines, lines) };
};

const groupContiguous = (entries: LeafWithLines[], prefix: string): Map<string, Fragment> => {
  const out = new Map<string, Fragment>();
  for (const { leaf, lines } of entries) {
    for (const id of markIdsOf(leaf, prefix)) {
      out.set(id, mergeFragment(out.get(id), leaf, lines));
    }
  }
  return out;
};

/** Inputs collected by the editor / app for a single walk. */
export interface AnnotationSources {
  value: PlateValue;
  commentBodies: Map<string, string>;
  /** Optional per-comment image refs (`${uuid}${ext}` strings), parallel to `commentBodies`. */
  commentImages?: Map<string, string[]>;
  globalComments: GlobalCommentEntry[];
}

interface CommentParts {
  id: string;
  fragment: Fragment;
  body: string | undefined;
  images: string[] | undefined;
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

const buildCommentEntry = ({
  id,
  fragment,
  body,
  images,
}: CommentParts): ({ kind: "comment" } & CommentEntry) | null => {
  const hasContent = nonEmpty(body) || nonEmpty(images);
  if (!hasContent) return null;
  const entry: { kind: "comment" } & CommentEntry = {
    kind: "comment",
    id,
    originalText: fragment.text,
    body: body ?? "",
  };
  decorateLines(entry, fragment);
  decorateImages(entry, images);
  return entry;
};

const walkCommentEntries = (
  entries: LeafWithLines[],
  bodies: Map<string, string>,
  imagesByCommentId: Map<string, string[]> | undefined
): AnnotationEntry[] => {
  const out: AnnotationEntry[] = [];
  for (const [id, fragment] of groupContiguous(entries, commentIdPrefix)) {
    const entry = buildCommentEntry({
      id,
      fragment,
      body: bodies.get(id),
      images: imagesByCommentId?.get(id),
    });
    if (entry !== null) out.push(entry);
  }
  return out;
};

const walkDeletionEntries = (entries: LeafWithLines[]): AnnotationEntry[] => {
  const out: AnnotationEntry[] = [];
  for (const [id, fragment] of groupContiguous(entries, suggestionIdPrefix)) {
    const entry: { kind: "deletion" } & DeletionEntry = {
      kind: "deletion",
      id,
      originalText: fragment.text,
    };
    if (fragment.lines !== undefined) entry.lines = fragment.lines;
    out.push(entry);
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
    ...walkCommentEntries(entries, sources.commentBodies, sources.commentImages),
    ...walkDeletionEntries(entries),
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
});

const stripDeletionKind = (e: { kind: "deletion" } & DeletionEntry): DeletionEntry => ({
  id: e.id,
  originalText: e.originalText,
  ...(e.author === undefined ? {} : { author: e.author }),
  ...(e.images === undefined ? {} : { images: e.images }),
  ...(e.lines === undefined ? {} : { lines: e.lines }),
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
