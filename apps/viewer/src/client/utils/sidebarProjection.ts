import {
  walkAnnotations,
  type AnnotationEntry,
  type GlobalCommentEntry,
  type PlateValue,
} from "@symbiot/annotations";
import { type AnnotationSidebarEntry } from "@symbiot/ui/components/AnnotationSidebarTypes";

/** Snapshot of every annotation source the sidebar needs to project a flat entry list. */
export interface SourceWindow {
  value: unknown[];
  commentBodies: Map<string, string>;
  commentImages: Map<string, string[]>;
  globalComments: GlobalCommentEntry[];
  /** Sidecar maps captured at annotation creation; drive drift detection in the walker. */
  commentOriginalTexts?: Map<string, string>;
  suggestionOriginalTexts?: Map<string, string>;
  /** Per-insertion proposed text + image refs + anchor snapshot. */
  insertionNewTexts?: Map<string, string>;
  insertionImages?: Map<string, string[]>;
  insertionOriginalTexts?: Map<string, string>;
  /** Per-replacement proposed text + image refs + anchor snapshot. */
  replacementTexts?: Map<string, string>;
  replacementImages?: Map<string, string[]>;
  replacementOriginalTexts?: Map<string, string>;
}

type SidebarKind = AnnotationSidebarEntry["kind"];
type SupportedEntry = Extract<AnnotationEntry, { kind: SidebarKind }>;

// The six sidebar-renderable kinds: Comment, Deletion, Global, Insertion,
// Replacement, Task. (Set membership keeps the guard under the complexity cap.)
const sidebarKinds = new Set<AnnotationEntry["kind"]>([
  "comment",
  "deletion",
  "global",
  "insertion",
  "replacement",
  "task",
]);

const isSupportedSidebarEntry = (entry: AnnotationEntry): entry is SupportedEntry =>
  sidebarKinds.has(entry.kind);

type AnchoredEntry = Exclude<SupportedEntry, { kind: "global" }>;

const anchoredPrimary = (entry: AnchoredEntry): string => {
  if (entry.kind === "insertion") return entry.contextText;
  return entry.originalText;
};

const taskBody = (checked: boolean): string => (checked ? "Mark as done" : "Mark as not done");

const anchoredBody = (entry: AnchoredEntry): string | undefined => {
  if (entry.kind === "comment") return entry.body;
  if (entry.kind === "insertion") return entry.newText;
  if (entry.kind === "replacement") return entry.replacementText;
  if (entry.kind === "task") return taskBody(entry.checked);
  return undefined;
};

const decorateOptional = (
  base: AnnotationSidebarEntry,
  entry: AnchoredEntry
): AnnotationSidebarEntry => {
  if (entry.lines !== undefined) base.lines = entry.lines;
  if (entry.drifted === true) base.drifted = true;
  return base;
};

// Convert a single walker entry into the projection the sidebar component consumes.
const toSidebarEntry = (entry: SupportedEntry): AnnotationSidebarEntry => {
  if (entry.kind === "global") {
    return { id: entry.id, kind: "global", primary: entry.body };
  }
  const base: AnnotationSidebarEntry = {
    id: entry.id,
    kind: entry.kind,
    primary: anchoredPrimary(entry),
  };
  const body = anchoredBody(entry);
  if (body !== undefined) base.body = body;
  return decorateOptional(base, entry);
};

/** Filter + map an already-walked entry list to the sidebar-renderable projection. */
export const projectWalkerEntries = (entries: AnnotationEntry[]): AnnotationSidebarEntry[] =>
  entries.filter(isSupportedSidebarEntry).map(toSidebarEntry);

/** Walk a source window and project to sidebar entries across all five kinds. */
export const projectEntries = (sources: SourceWindow): AnnotationSidebarEntry[] =>
  projectWalkerEntries(
    walkAnnotations({
      value: sources.value as PlateValue,
      commentBodies: sources.commentBodies,
      commentImages: sources.commentImages,
      globalComments: sources.globalComments,
      commentOriginalTexts: sources.commentOriginalTexts,
      suggestionOriginalTexts: sources.suggestionOriginalTexts,
      insertionNewTexts: sources.insertionNewTexts,
      insertionImages: sources.insertionImages,
      insertionOriginalTexts: sources.insertionOriginalTexts,
      replacementTexts: sources.replacementTexts,
      replacementImages: sources.replacementImages,
      replacementOriginalTexts: sources.replacementOriginalTexts,
    })
  );

/** Scroll the DOM range tagged with `data-anno-id` into view. No-op when missing. */
export const focusAnnotation = (id: string): void => {
  const target = document.querySelector(`[data-anno-id="${id}"]`);
  if (target === null) return;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
};
