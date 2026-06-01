import { useCallback, useEffect, type Dispatch, type SetStateAction } from "react";
import type { PlateEditor } from "platejs/react";
import { type AnnotationComposerPayload } from "@symbiot/ui/components/AnnotationComposer";

import {
  applyAnnotation,
  hasValidSelection,
  type AppliedAnnotation,
} from "../utils/applyAnnotation.ts";
import { removeAnnotationMark } from "../utils/removeAnnotationMark.ts";

import { snapshotOf } from "./ReviewEditorPrune.tsx";
import { type AnnotationMaps, type PruneSetters } from "./ReviewEditorState.tsx";
import {
  type AnnotationHandleKind,
  type EditorSnapshot,
  type ReviewEditorHandle,
} from "./ReviewEditorTypes.tsx";

/** Authoring flow currently in flight, waiting for the composer's Save. */
export type PendingAuthoring =
  | { kind: "comment"; applied: AppliedAnnotation }
  | { kind: "insertion"; applied: AppliedAnnotation }
  | { kind: "replacement"; applied: AppliedAnnotation };

/** Save the composer payload into the comment maps. */
export const saveCommentBody = (
  setters: PruneSetters,
  id: string,
  anchorText: string,
  payload: AnnotationComposerPayload
): void => {
  setters.setBodies((prev) => new Map(prev).set(id, payload.body));
  if (payload.images.length > 0) {
    setters.setImages((prev) => new Map(prev).set(id, payload.images));
  }
  setters.setCommentOriginalTexts((prev) => new Map(prev).set(id, anchorText));
};

/** Save the composer payload into the insertion maps. */
export const saveInsertionBody = (
  setters: PruneSetters,
  id: string,
  anchorText: string,
  payload: AnnotationComposerPayload
): void => {
  setters.setInsertionNewTexts((prev) => new Map(prev).set(id, payload.body));
  if (payload.images.length > 0) {
    setters.setInsertionImages((prev) => new Map(prev).set(id, payload.images));
  }
  setters.setInsertionOriginalTexts((prev) => new Map(prev).set(id, anchorText));
};

/** Save the composer payload into the replacement maps. */
export const saveReplacementBody = (
  setters: PruneSetters,
  id: string,
  anchorText: string,
  payload: AnnotationComposerPayload
): void => {
  setters.setReplacementTexts((prev) => new Map(prev).set(id, payload.body));
  if (payload.images.length > 0) {
    setters.setReplacementImages((prev) => new Map(prev).set(id, payload.images));
  }
  setters.setReplacementOriginalTexts((prev) => new Map(prev).set(id, anchorText));
};

/** Toolbar button click handlers wired to {@link applyAnnotation}. */
export interface ToolbarHandlers {
  onCommentClick: () => void;
  onInsertClick: () => void;
  onReplaceClick: () => void;
  onDeleteClick: () => void;
  /** Dispatch the matching handler by kind; used by host-side hotkeys. */
  triggerAnnotation: (kind: AnnotationHandleKind) => void;
}

/** Dependencies passed into the toolbar-handlers hook. */
export interface ToolbarHandlerDeps {
  editor: PlateEditor;
  maps: AnnotationMaps;
  setters: PruneSetters;
  setPending: Dispatch<SetStateAction<PendingAuthoring | null>>;
  onChange?: (snapshot: EditorSnapshot) => void;
}

/** Toolbar click handlers — extracted so `ReviewEditor` stays under the line-count cap. */
export const useToolbarHandlers = ({
  editor,
  maps,
  setters,
  setPending,
  onChange,
}: ToolbarHandlerDeps): ToolbarHandlers => {
  const openComposer = useCallback(
    (kind: "comment" | "insertion" | "replacement"): void => {
      const applied = applyAnnotation(editor, kind);
      if (applied === null) return;
      setPending({ kind, applied });
    },
    [editor, setPending]
  );
  const onCommentClick = useCallback((): void => openComposer("comment"), [openComposer]);
  const onInsertClick = useCallback((): void => openComposer("insertion"), [openComposer]);
  const onReplaceClick = useCallback((): void => openComposer("replacement"), [openComposer]);
  const onDeleteClick = useCallback((): void => {
    const applied = applyAnnotation(editor, "deletion");
    if (applied === null) {
      onChange?.(snapshotOf(editor, maps));
      return;
    }
    setters.setSuggestionOriginalTexts((prev) => new Map(prev).set(applied.id, applied.anchorText));
  }, [editor, maps, onChange, setters]);
  const triggerAnnotation = useCallback(
    (kind: AnnotationHandleKind): void => {
      if (kind === "comment") onCommentClick();
      else if (kind === "insertion") onInsertClick();
      else if (kind === "replacement") onReplaceClick();
      else onDeleteClick();
    },
    [onCommentClick, onInsertClick, onReplaceClick, onDeleteClick]
  );
  return { onCommentClick, onInsertClick, onReplaceClick, onDeleteClick, triggerAnnotation };
};

/** Wire up the imperative `ReviewEditorHandle` and surface it through `onReady`. */
export const useReadyHandle = (
  editor: PlateEditor,
  maps: AnnotationMaps,
  removeAnnotation: ReviewEditorHandle["removeAnnotation"],
  triggerAnnotation: ReviewEditorHandle["triggerAnnotation"],
  onReady?: (h: ReviewEditorHandle) => void
): void => {
  useEffect(() => {
    onReady?.({
      hasValidSelection: () => hasValidSelection(editor),
      triggerAnnotation,
      getValue: () => editor.children,
      getCommentBodies: () => new Map(maps.bodies),
      getCommentImages: () => new Map(maps.images),
      getCommentOriginalTexts: () => new Map(maps.commentOriginalTexts),
      getSuggestionOriginalTexts: () => new Map(maps.suggestionOriginalTexts),
      getInsertionNewTexts: () => new Map(maps.insertionNewTexts),
      getInsertionImages: () => new Map(maps.insertionImages),
      getInsertionOriginalTexts: () => new Map(maps.insertionOriginalTexts),
      getReplacementTexts: () => new Map(maps.replacementTexts),
      getReplacementImages: () => new Map(maps.replacementImages),
      getReplacementOriginalTexts: () => new Map(maps.replacementOriginalTexts),
      removeAnnotation,
    });
  }, [editor, maps, removeAnnotation, triggerAnnotation, onReady]);
};

/** Annotation handle kinds that route through the composer. */
export type ComposerKind = PendingAuthoring["kind"];

/** Dispatch the composer payload to the matching map saver. */
export const dispatchComposerSave = (
  pending: PendingAuthoring,
  payload: AnnotationComposerPayload,
  setters: PruneSetters
): void => {
  const { id, anchorText } = pending.applied;
  if (pending.kind === "comment") {
    saveCommentBody(setters, id, anchorText, payload);
    return;
  }
  if (pending.kind === "insertion") {
    saveInsertionBody(setters, id, anchorText, payload);
    return;
  }
  saveReplacementBody(setters, id, anchorText, payload);
};

/**
 * Roll back the eagerly-applied annotation mark when the composer is cancelled.
 * Pattern A applies the mark on open, so every cancel route (button, Escape,
 * overlay) must remove it or the selection stays highlighted with no body. No
 * map pruning is needed: a body is only stored on save, so the cancelled id
 * never entered the annotation maps. Mirrors {@link dispatchComposerSave}.
 */
export const dispatchComposerCancel = (
  pending: PendingAuthoring | null,
  editor: PlateEditor,
  maps: AnnotationMaps,
  onChange?: (snapshot: EditorSnapshot) => void
): void => {
  if (pending === null) return;
  removeAnnotationMark(editor, pending.kind, pending.applied.id);
  onChange?.(snapshotOf(editor, maps));
};
