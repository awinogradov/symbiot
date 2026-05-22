import {
  walkAnnotations,
  type AnnotationEntry,
  type GlobalCommentEntry,
  type PlateValue,
} from "@symbiot/annotations";
import { type AnnotationSidebarEntry } from "@symbiot/ui/components/AnnotationSidebar";

/** Snapshot of every annotation source the sidebar needs to project a flat entry list. */
export interface SourceWindow {
  value: unknown[];
  commentBodies: Map<string, string>;
  commentImages: Map<string, string[]>;
  globalComments: GlobalCommentEntry[];
  /** Sidecar maps captured at annotation creation; drive drift detection in the walker. Phase 4.3. */
  commentOriginalTexts?: Map<string, string>;
  suggestionOriginalTexts?: Map<string, string>;
}

type SidebarKind = AnnotationSidebarEntry["kind"];
type SupportedEntry = Extract<AnnotationEntry, { kind: SidebarKind }>;

/**
 * Narrows a walked entry to the kinds the sidebar can render today (C / D / G).
 * Insertion and Replacement land with their authoring UI in Phases 5.2 / 5.3.
 */
export const isSupportedSidebarEntry = (entry: AnnotationEntry): entry is SupportedEntry =>
  entry.kind === "comment" || entry.kind === "deletion" || entry.kind === "global";

/** Convert a single walker entry into the projection the sidebar component consumes. */
export const toSidebarEntry = (entry: SupportedEntry): AnnotationSidebarEntry => {
  if (entry.kind === "global") {
    return { id: entry.id, kind: "global", primary: entry.body };
  }
  const base: AnnotationSidebarEntry = {
    id: entry.id,
    kind: entry.kind,
    primary: entry.originalText,
  };
  if (entry.kind === "comment") base.body = entry.body;
  if (entry.lines !== undefined) base.lines = entry.lines;
  if (entry.drifted === true) base.drifted = true;
  return base;
};

/**
 * Walk a source window and project to sidebar entries. Insertion and
 * Replacement entries are filtered out — sidebar rendering for those types
 * lands in Phases 5.2 / 5.3 alongside their authoring UI.
 */
export const projectEntries = (sources: SourceWindow): AnnotationSidebarEntry[] =>
  walkAnnotations({
    value: sources.value as PlateValue,
    commentBodies: sources.commentBodies,
    commentImages: sources.commentImages,
    globalComments: sources.globalComments,
    commentOriginalTexts: sources.commentOriginalTexts,
    suggestionOriginalTexts: sources.suggestionOriginalTexts,
  })
    .filter(isSupportedSidebarEntry)
    .map(toSidebarEntry);

/** Scroll the DOM range tagged with `data-anno-id` into view. No-op when missing. */
export const focusAnnotation = (id: string): void => {
  const target = document.querySelector(`[data-anno-id="${id}"]`);
  if (target === null) return;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
};
