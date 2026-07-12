import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { PlateEditor } from "platejs/react";
import { type AnnotationComposerPayload } from "@symbiot/ui/components/AnnotationComposer";

import {
  applyAnnotation,
  capturePendingAnnotation,
  hasValidSelection,
  materializeAnnotation,
  type PendingAppliedAnnotation,
} from "../utils/applyAnnotation.ts";
import { clearPendingHighlight } from "../utils/pendingHighlight.ts";
import { removeAnnotationMark } from "../utils/removeAnnotationMark.ts";
import { removeTaskToggle } from "../utils/removeTaskToggle.ts";

import { pruneRemovedAnnotation, snapshotOf } from "./ReviewEditorPrune.tsx";
import { type AnnotationMaps, type PruneSetters } from "./ReviewEditorState.tsx";
import {
  type AnnotationHandleKind,
  type EditorSnapshot,
  type ReviewEditorHandle,
} from "./ReviewEditorTypes.tsx";

/** Authoring flow currently in flight, waiting for the composer's Save. */
export type PendingAuthoring =
  | { kind: "comment"; applied: PendingAppliedAnnotation }
  | { kind: "insertion"; applied: PendingAppliedAnnotation }
  | { kind: "replacement"; applied: PendingAppliedAnnotation };

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

/** Toolbar button click handlers wired to {@link capturePendingAnnotation} / {@link applyAnnotation}. */
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
      const applied = capturePendingAnnotation(editor, kind);
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
  updateAnnotation: ReviewEditorHandle["updateAnnotation"],
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
      updateAnnotation,
    });
  }, [editor, maps, removeAnnotation, updateAnnotation, triggerAnnotation, onReady]);
};

/**
 * Set `id`'s images when non-empty, drop the key when empty so the map keeps its
 * "absent key ⇒ no images" shape (the add path never stores empty arrays). Returns
 * the same map reference when nothing changes.
 */
const withImages = (
  map: Map<string, string[]>,
  id: string,
  images: string[]
): Map<string, string[]> => {
  if (images.length > 0) return new Map(map).set(id, images);
  if (!map.has(id)) return map;
  const next = new Map(map);
  next.delete(id);
  return next;
};

/** The body + image maps + their setters for one body-bearing kind. */
interface UpdateTarget {
  body: Map<string, string>;
  images: Map<string, string[]>;
  setBody: PruneSetters["setBodies"];
  setImages: PruneSetters["setImages"];
}

const updateTarget = (
  kind: "comment" | "insertion" | "replacement",
  current: AnnotationMaps,
  setters: PruneSetters
): UpdateTarget => {
  if (kind === "comment") {
    return {
      body: current.bodies,
      images: current.images,
      setBody: setters.setBodies,
      setImages: setters.setImages,
    };
  }
  if (kind === "insertion") {
    return {
      body: current.insertionNewTexts,
      images: current.insertionImages,
      setBody: setters.setInsertionNewTexts,
      setImages: setters.setInsertionImages,
    };
  }
  return {
    body: current.replacementTexts,
    images: current.replacementImages,
    setBody: setters.setReplacementTexts,
    setImages: setters.setReplacementImages,
  };
};

/**
 * Replace the body + images of an existing body-bearing annotation in place.
 *
 * Mirrors {@link pruneRemovedAnnotation}'s shape (reads `current` so existence is
 * checked atomically) but writes instead of deletes. Only the text + image maps
 * for `id` change; `*OriginalTexts` and the Plate mark are left alone so the
 * anchor + drift baseline survive the edit. No-op when `id` is unknown, which
 * stops a stale edit from resurrecting a removed annotation. Persistence flows
 * through the host's existing maps-change effect — unlike removal there is no
 * Plate-value mutation to capture, so no explicit `onChange` is needed here.
 */
export const updateAnnotationMaps = (
  kind: "comment" | "insertion" | "replacement",
  id: string,
  body: string,
  images: string[],
  current: AnnotationMaps,
  setters: PruneSetters
): void => {
  const target = updateTarget(kind, current, setters);
  if (!target.body.has(id)) return;
  target.setBody(new Map(target.body).set(id, body));
  target.setImages(withImages(target.images, id, images));
};

/**
 * Memoized `removeAnnotation` handle method: clears the Plate mark, prunes every
 * map for the id, and pushes a fresh snapshot. Extracted (like {@link useReadyHandle})
 * so `ReviewEditor` stays under the per-function line cap.
 */
export const useRemoveAnnotation = (
  editor: PlateEditor,
  maps: AnnotationMaps,
  setters: PruneSetters,
  onChange?: (snapshot: EditorSnapshot) => void
): ReviewEditorHandle["removeAnnotation"] =>
  useCallback(
    (kind, id) => {
      if (kind === "task") {
        removeTaskToggle(editor, id);
        onChange?.(snapshotOf(editor, maps));
        return;
      }
      removeAnnotationMark(editor, kind, id);
      const next = pruneRemovedAnnotation(kind, id, maps, setters);
      onChange?.(snapshotOf(editor, next));
    },
    [editor, maps, onChange, setters]
  );

/**
 * Memoized `updateAnnotation` handle method bound to the current maps + setters.
 * Extracted (like {@link useReadyHandle}) so `ReviewEditor` stays under the
 * per-function line cap. Persistence flows through the host's maps-change effect.
 */
export const useUpdateAnnotation = (
  maps: AnnotationMaps,
  setters: PruneSetters
): ReviewEditorHandle["updateAnnotation"] =>
  useCallback(
    (kind, id, body, images) => updateAnnotationMaps(kind, id, body, images, maps, setters),
    [maps, setters]
  );

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

/** Pending composer state plus its save / cancel handlers. */
export interface ComposerController {
  /** Authoring flow awaiting the composer's Save, or `null` when the composer is closed. */
  pending: PendingAuthoring | null;
  /** Opens the composer for a freshly-captured annotation; wired to {@link useToolbarHandlers}. */
  setPending: Dispatch<SetStateAction<PendingAuthoring | null>>;
  /** Materialize the stored marks, persist the composer payload, and close. */
  onComposerSave: (payload: AnnotationComposerPayload) => void;
  /** Close without saving; clears the pending decoration (no model mutation). */
  onComposerCancel: () => void;
}

/**
 * Own the inline composer's `pending` state and its save / cancel handlers.
 *
 * While pending, the eager highlight never touches the model: it is a
 * decoration projected by `../utils/pendingHighlight.ts`. Cancel therefore
 * only clears that decoration — no rollback transform exists to race, undo
 * history survives, and a mid-compose draft can never persist a body-less
 * eager mark (that leak seeded the symbiot#236 draft bleed-through flake).
 * Save clears the decoration first (the split transform rewrites the leaf
 * boundaries its range points into), then materializes the stored marks via
 * {@link materializeAnnotation} before persisting the body.
 *
 * Save and cancel are already separate handlers: a save closes the dialog
 * programmatically (`open` → false), which does NOT fire Radix `onOpenChange`,
 * so it never reaches {@link onComposerCancel}; only genuine dismisses (button /
 * Escape / overlay click) do. `savedRef` still guards the cancel path so that
 * even if a controlled close were to surface through `onOpenChange`, a
 * just-saved annotation is kept; it is cleared whenever a fresh composer opens
 * so a prior save never suppresses the next cancel. `pendingRef` mirrors
 * `pending` so the handlers act on the CURRENT id even when Radix invokes the
 * callback from a stale render. The unmount cleanup clears any decoration an
 * abnormal teardown (e.g. unmounting with the composer open) would otherwise
 * strand on the persistent editor instance. Extracted (like
 * {@link useRemoveAnnotation}) so `ReviewEditor` stays under the per-function
 * line cap.
 */
export const useComposerController = (
  editor: PlateEditor,
  setters: PruneSetters
): ComposerController => {
  const [pending, setPending] = useState<PendingAuthoring | null>(null);
  const pendingRef = useRef<PendingAuthoring | null>(null);
  const savedRef = useRef(false);

  useEffect(() => {
    pendingRef.current = pending;
    if (pending !== null) savedRef.current = false;
  }, [pending]);

  useEffect(() => () => clearPendingHighlight(editor), [editor]);

  const onComposerSave = useCallback(
    (payload: AnnotationComposerPayload): void => {
      const { current } = pendingRef;
      if (current === null) return;
      clearPendingHighlight(editor);
      materializeAnnotation(editor, current.kind, current.applied.id, current.applied.range);
      dispatchComposerSave(current, payload, setters);
      savedRef.current = true;
      setPending(null);
    },
    [editor, setters]
  );

  const onComposerCancel = useCallback((): void => {
    if (savedRef.current) {
      savedRef.current = false;
      return;
    }
    clearPendingHighlight(editor);
    setPending(null);
  }, [editor]);

  return { pending, setPending, onComposerSave, onComposerCancel };
};
