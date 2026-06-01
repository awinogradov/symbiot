/**
 * @module editPrefill
 *
 * Pure helpers that resolve the body + images to prefill the annotation edit
 * composer, and build global-comment entries. Kept here (a unit-owned editor
 * util) rather than in the viewer host so the branchy kind-dispatch and the
 * defensive fallbacks are exercised by fast unit tests instead of the BDD gate.
 *
 * @example
 * const content = resolveEditContent("comment", id, entry.body ?? "", globals, handle);
 * // → { body, images } seeded into <AnnotationComposer mode="edit" />
 */
import { type GlobalCommentEntry } from "@symbiot/annotations";

import { type ReviewEditorHandle } from "../components/ReviewEditorTypes.tsx";

/** Editable body + images of an annotation, used to prefill the edit composer. */
export interface EditContent {
  body: string;
  images: string[];
}

/** Body-bearing kinds the edit composer accepts plus the non-editable `deletion`. */
type EditableKind = "comment" | "deletion" | "global" | "insertion" | "replacement";
type AnchoredKind = "comment" | "insertion" | "replacement";

/** Build a global comment, attaching `images` only when non-empty (keeps the persisted shape lean). */
export const buildGlobalComment = (
  id: string,
  body: string,
  images: string[]
): GlobalCommentEntry => {
  const entry: GlobalCommentEntry = { id, body };
  if (images.length > 0) entry.images = images;
  return entry;
};

/** The body + image maps for an anchored kind, from the editor handle (source of truth). */
const anchoredMaps = (
  handle: ReviewEditorHandle,
  kind: AnchoredKind
): { body: Map<string, string>; images: Map<string, string[]> } => {
  if (kind === "comment") {
    return { body: handle.getCommentBodies(), images: handle.getCommentImages() };
  }
  if (kind === "insertion") {
    return { body: handle.getInsertionNewTexts(), images: handle.getInsertionImages() };
  }
  return { body: handle.getReplacementTexts(), images: handle.getReplacementImages() };
};

/** Prefill content for an anchored annotation, read from the handle maps. */
const anchoredEditContent = (
  handle: ReviewEditorHandle,
  kind: AnchoredKind,
  id: string
): EditContent => {
  const { body, images } = anchoredMaps(handle, kind);
  return { body: body.get(id) ?? "", images: images.get(id) ?? [] };
};

/** Prefill content for a global comment, read from host state. */
const globalEditContent = (globalComments: GlobalCommentEntry[], id: string): EditContent => {
  const found = globalComments.find((g) => g.id === id);
  return { body: found?.body ?? "", images: found?.images ?? [] };
};

/**
 * Resolve prefill content for an entry. Anchored kinds read from the handle
 * (the source of truth); `global` reads from host state; `deletion` and the
 * not-yet-mounted-handle case fall back to the projected body with no images.
 */
export const resolveEditContent = (
  kind: EditableKind,
  id: string,
  fallbackBody: string,
  globalComments: GlobalCommentEntry[],
  handle: ReviewEditorHandle | null
): EditContent => {
  if (kind === "global") return globalEditContent(globalComments, id);
  if (kind === "deletion" || handle === null) return { body: fallbackBody, images: [] };
  return anchoredEditContent(handle, kind, id);
};
