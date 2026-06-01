/**
 * Shared types + display helpers for the annotation sidebar surface.
 *
 * Lives in its own module so `AnnotationSidebar.tsx` (shell), the per-entry
 * row, the list, and the history pane all key off one source of truth. The
 * `kindLabel` / `kindClass` / `removalDescription` helpers are intentionally
 * pure functions over the discriminated `kind` field — no React, no Tailwind
 * `cn()` — so they can be reused in tests without dragging the UI surface.
 */

import { type AnnotationComposerKind } from "./AnnotationComposer.tsx";

/**
 * Sidebar-friendly projection of an annotation. Keeps `kind` + `id` + `text` so
 * the right panel doesn't depend on the full `@symbiot/annotations` type tree —
 * the host serializes once and passes the result.
 */
export interface AnnotationSidebarEntry {
  id: string;
  kind: "comment" | "deletion" | "global" | "insertion" | "replacement";
  /** Either the anchored selection (C/D/I context) or the body (G). */
  primary: string;
  /** Comment body for C, proposed new text for I; undefined for G/D. */
  body?: string;
  lines?: { startLine: number; endLine: number };
  /**
   * `true` when the annotation's anchor could not be resolved against the
   * current plan version (path + text-quote both failed). Surfaced as a
   * "drifted" badge in the sidebar.
   */
  drifted?: boolean;
}

/** Diff render mode controlled by the Clean/Raw toggle inside the History tab. */
export type SidebarDiffMode = "clean" | "raw";

const kindLabels: Record<AnnotationSidebarEntry["kind"], string> = {
  comment: "Comment",
  deletion: "Deletion",
  global: "Global",
  insertion: "Insertion",
  replacement: "Replacement",
};

const kindClasses: Record<AnnotationSidebarEntry["kind"], string> = {
  comment: "text-anno-comment",
  global: "text-anno-comment",
  deletion: "text-anno-delete",
  insertion: "text-anno-insert",
  replacement: "text-anno-replace",
};

const removalDescriptions: Record<AnnotationSidebarEntry["kind"], string> = {
  comment: "This removes the comment from the plan. It can't be undone.",
  deletion: "This removes the deletion suggestion from the plan. It can't be undone.",
  global: "This removes the global comment from the plan. It can't be undone.",
  insertion: "This removes the insertion suggestion from the plan. It can't be undone.",
  replacement: "This removes the replacement suggestion from the plan. It can't be undone.",
};

/** Human-readable label for the row's kind chip. */
export const kindLabel = (kind: AnnotationSidebarEntry["kind"]): string => kindLabels[kind];

/** Tailwind colour class for the row's kind chip. */
export const kindClass = (kind: AnnotationSidebarEntry["kind"]): string => kindClasses[kind];

/** Body of the per-row removal confirmation dialog. */
export const removalDescription = (kind: AnnotationSidebarEntry["kind"]): string =>
  removalDescriptions[kind];

/**
 * Whether a kind carries editable content, so the sidebar row offers the edit
 * (pencil) action. `deletion` has no body and stays remove-only; the remaining
 * kinds map one-to-one onto the {@link AnnotationComposerKind} the edit composer
 * accepts, so this doubles as the narrowing guard for that handoff.
 */
export const isBodyBearingKind = (
  kind: AnnotationSidebarEntry["kind"]
): kind is AnnotationComposerKind =>
  kind === "comment" || kind === "global" || kind === "insertion" || kind === "replacement";
