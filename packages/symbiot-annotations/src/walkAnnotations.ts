import type {
  AnnotationEntry,
  CommentEntry,
  DeletionEntry,
  GlobalCommentEntry,
  PlateNode,
  PlateTextLeaf,
  PlateValue,
} from "./types.ts";

const commentIdPrefix = "comment_";
const suggestionIdPrefix = "suggestion_";

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

const collectLeaves = (value: PlateValue): PlateTextLeaf[] => {
  const out: PlateTextLeaf[] = [];
  const visit = (node: PlateNode): void => {
    if (isText(node)) {
      out.push(node);
      return;
    }
    for (const child of node.children) visit(child);
  };
  for (const node of value) visit(node);
  return out;
};

const groupContiguous = (leaves: PlateTextLeaf[], prefix: string): Map<string, string> => {
  const fragments = new Map<string, string>();
  for (const leaf of leaves) {
    for (const id of markIdsOf(leaf, prefix)) {
      fragments.set(id, (fragments.get(id) ?? "") + leaf.text);
    }
  }
  return fragments;
};

/** Inputs collected by the editor / app for a single walk. */
export interface AnnotationSources {
  value: PlateValue;
  commentBodies: Map<string, string>;
  globalComments: GlobalCommentEntry[];
}

const walkCommentEntries = (
  leaves: PlateTextLeaf[],
  bodies: Map<string, string>
): AnnotationEntry[] => {
  const out: AnnotationEntry[] = [];
  for (const [id, originalText] of groupContiguous(leaves, commentIdPrefix)) {
    const body = bodies.get(id);
    if (body === undefined || body.length === 0) continue;
    out.push({ kind: "comment", id, originalText, body });
  }
  return out;
};

const walkDeletionEntries = (leaves: PlateTextLeaf[]): AnnotationEntry[] => {
  const out: AnnotationEntry[] = [];
  for (const [id, originalText] of groupContiguous(leaves, suggestionIdPrefix)) {
    out.push({ kind: "deletion", id, originalText });
  }
  return out;
};

const walkGlobalEntries = (globals: GlobalCommentEntry[]): AnnotationEntry[] =>
  globals.map((g) => ({ kind: "global", ...g }));

/**
 * Walk a Plate value and surface every annotation (Comment + Deletion) plus
 * app-level Global Comments. Comments come from `comment_<id>` marks paired
 * with `commentBodies`; Deletions come from the `@platejs/suggestion`
 * `suggestion_<id>` marks; Global Comments are passed in directly.
 */
export const walkAnnotations = (sources: AnnotationSources): AnnotationEntry[] => {
  const leaves = collectLeaves(sources.value);
  return [
    ...walkCommentEntries(leaves, sources.commentBodies),
    ...walkDeletionEntries(leaves),
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
