import type { PlateEditor } from "platejs/react";

import { type AnnotationHandleKind, type EditorSnapshot } from "./ReviewEditorTypes.tsx";
import type { AnnotationMaps, PruneSetters } from "./ReviewEditorState.tsx";

const withoutKey = <V,>(map: Map<string, V>, key: string): Map<string, V> => {
  if (!map.has(key)) return map;
  const next = new Map(map);
  next.delete(key);
  return next;
};

const pruneComment = (
  id: string,
  current: AnnotationMaps,
  setters: PruneSetters
): AnnotationMaps => {
  const bodies = withoutKey(current.bodies, id);
  const images = withoutKey(current.images, id);
  const commentOriginalTexts = withoutKey(current.commentOriginalTexts, id);
  if (bodies !== current.bodies) setters.setBodies(bodies);
  if (images !== current.images) setters.setImages(images);
  if (commentOriginalTexts !== current.commentOriginalTexts) {
    setters.setCommentOriginalTexts(commentOriginalTexts);
  }
  return { ...current, bodies, images, commentOriginalTexts };
};

const pruneDeletion = (
  id: string,
  current: AnnotationMaps,
  setters: PruneSetters
): AnnotationMaps => {
  const suggestionOriginalTexts = withoutKey(current.suggestionOriginalTexts, id);
  if (suggestionOriginalTexts !== current.suggestionOriginalTexts) {
    setters.setSuggestionOriginalTexts(suggestionOriginalTexts);
  }
  return { ...current, suggestionOriginalTexts };
};

const pruneInsertion = (
  id: string,
  current: AnnotationMaps,
  setters: PruneSetters
): AnnotationMaps => {
  const insertionNewTexts = withoutKey(current.insertionNewTexts, id);
  const insertionImages = withoutKey(current.insertionImages, id);
  const insertionOriginalTexts = withoutKey(current.insertionOriginalTexts, id);
  if (insertionNewTexts !== current.insertionNewTexts) {
    setters.setInsertionNewTexts(insertionNewTexts);
  }
  if (insertionImages !== current.insertionImages) {
    setters.setInsertionImages(insertionImages);
  }
  if (insertionOriginalTexts !== current.insertionOriginalTexts) {
    setters.setInsertionOriginalTexts(insertionOriginalTexts);
  }
  return { ...current, insertionNewTexts, insertionImages, insertionOriginalTexts };
};

const pruneReplacement = (
  id: string,
  current: AnnotationMaps,
  setters: PruneSetters
): AnnotationMaps => {
  const replacementTexts = withoutKey(current.replacementTexts, id);
  const replacementImages = withoutKey(current.replacementImages, id);
  const replacementOriginalTexts = withoutKey(current.replacementOriginalTexts, id);
  if (replacementTexts !== current.replacementTexts) {
    setters.setReplacementTexts(replacementTexts);
  }
  if (replacementImages !== current.replacementImages) {
    setters.setReplacementImages(replacementImages);
  }
  if (replacementOriginalTexts !== current.replacementOriginalTexts) {
    setters.setReplacementOriginalTexts(replacementOriginalTexts);
  }
  return { ...current, replacementTexts, replacementImages, replacementOriginalTexts };
};

/** Per-kind dispatch that drops the annotation's entry from every relevant map. */
export const pruneRemovedAnnotation = (
  kind: AnnotationHandleKind,
  id: string,
  current: AnnotationMaps,
  setters: PruneSetters
): AnnotationMaps => {
  if (kind === "comment") return pruneComment(id, current, setters);
  if (kind === "deletion") return pruneDeletion(id, current, setters);
  if (kind === "insertion") return pruneInsertion(id, current, setters);
  return pruneReplacement(id, current, setters);
};

/** Build the {@link EditorSnapshot} payload surfaced to the host on every change. */
export const snapshotOf = (editor: PlateEditor, maps: AnnotationMaps): EditorSnapshot => ({
  value: editor.children,
  commentBodies: new Map(maps.bodies),
  commentImages: new Map(maps.images),
  commentOriginalTexts: new Map(maps.commentOriginalTexts),
  suggestionOriginalTexts: new Map(maps.suggestionOriginalTexts),
  insertionNewTexts: new Map(maps.insertionNewTexts),
  insertionImages: new Map(maps.insertionImages),
  insertionOriginalTexts: new Map(maps.insertionOriginalTexts),
  replacementTexts: new Map(maps.replacementTexts),
  replacementImages: new Map(maps.replacementImages),
  replacementOriginalTexts: new Map(maps.replacementOriginalTexts),
});
