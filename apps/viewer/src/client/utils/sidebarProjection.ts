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
}

/**
 * Convert a single walker entry into the projection the sidebar component
 * consumes. The `drifted` flag is reserved for Phase 4.2 — anchors currently
 * walked from the live Plate value are by definition present, so 4.1 always
 * emits `false`.
 */
export const toSidebarEntry = (entry: AnnotationEntry): AnnotationSidebarEntry => {
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
  return base;
};

/** Walk a source window and project to sidebar entries. */
export const projectEntries = (sources: SourceWindow): AnnotationSidebarEntry[] =>
  walkAnnotations({
    value: sources.value as PlateValue,
    commentBodies: sources.commentBodies,
    commentImages: sources.commentImages,
    globalComments: sources.globalComments,
  }).map(toSidebarEntry);

/** Scroll the DOM range tagged with `data-anno-id` into view. No-op when missing. */
export const focusAnnotation = (id: string): void => {
  const target = document.querySelector(`[data-anno-id="${id}"]`);
  if (target === null) return;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
};
