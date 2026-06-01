import { useCallback, useMemo, useState } from "react";
import {
  walkAnnotations,
  type AnnotationEntry,
  type GlobalCommentEntry,
  type PlateValue,
} from "@symbiot/annotations";
import {
  type EditorSnapshot,
  type ReviewEditorHandle,
} from "@symbiot/editor/components/ReviewEditor";
import { type AnnotationSidebarEntry } from "@symbiot/ui/components/AnnotationSidebarTypes";

import { type DraftPayload } from "../../shared/apiTypes.ts";
import { projectEntries, projectWalkerEntries } from "../utils/sidebarProjection.ts";

/** Inputs that bind the review session to its loaded plan and persisted draft. */
export interface ReviewStateProps {
  draft: DraftPayload | null;
  saveDraft: (snapshot: {
    value: unknown[];
    commentBodies: Map<string, string>;
    commentImages: Map<string, string[]>;
    commentOriginalTexts: Map<string, string>;
    suggestionOriginalTexts: Map<string, string>;
    insertionNewTexts: Map<string, string>;
    insertionImages: Map<string, string[]>;
    insertionOriginalTexts: Map<string, string>;
    replacementTexts: Map<string, string>;
    replacementImages: Map<string, string[]>;
    replacementOriginalTexts: Map<string, string>;
    globalComments: GlobalCommentEntry[];
  }) => void;
}

/** Everything the `<ReviewScreen>` renders or wires through to children. */
export interface ReviewState {
  editorHandle: ReviewEditorHandle | null;
  sidebarEntries: AnnotationSidebarEntry[];
  initialValue: unknown[] | undefined;
  initialBodies: Map<string, string> | undefined;
  initialImages: Map<string, string[]> | undefined;
  initialCommentOriginalTexts: Map<string, string> | undefined;
  initialSuggestionOriginalTexts: Map<string, string> | undefined;
  initialInsertionNewTexts: Map<string, string> | undefined;
  initialInsertionImages: Map<string, string[]> | undefined;
  initialInsertionOriginalTexts: Map<string, string> | undefined;
  initialReplacementTexts: Map<string, string> | undefined;
  initialReplacementImages: Map<string, string[]> | undefined;
  initialReplacementOriginalTexts: Map<string, string> | undefined;
  reloadKey: number;
  collectEntries: () => AnnotationEntry[];
  setEditorHandle: (handle: ReviewEditorHandle) => void;
  onEditorChange: (snapshot: EditorSnapshot) => void;
  onAddGlobalComment: (body: string, images: string[]) => void;
  onRemoveAnnotation: (entry: AnnotationSidebarEntry) => void;
  /** Replace a body-bearing annotation's body + images in place, preserving id + anchor. */
  onUpdateAnnotation: (entry: AnnotationSidebarEntry, body: string, images: string[]) => void;
  /**
   * Current body + images for a body-bearing entry, used to prefill the edit
   * composer. Reads anchored content from the editor handle (the source of
   * truth) so the prefill never lags the latest in-editor edit.
   */
  editContent: (entry: AnnotationSidebarEntry) => { body: string; images: string[] };
  onClearAll: () => void;
}

const draftInitialMap = <V>(
  source: Record<string, V> | undefined,
  reloadKey: number
): Map<string, V> | undefined => {
  if (reloadKey !== 0 || source === undefined) return undefined;
  return new Map(Object.entries(source));
};

interface InitialDraftSlice {
  initialValue: unknown[] | undefined;
  initialBodies: Map<string, string> | undefined;
  initialImages: Map<string, string[]> | undefined;
  initialCommentOriginalTexts: Map<string, string> | undefined;
  initialSuggestionOriginalTexts: Map<string, string> | undefined;
  initialInsertionNewTexts: Map<string, string> | undefined;
  initialInsertionImages: Map<string, string[]> | undefined;
  initialInsertionOriginalTexts: Map<string, string> | undefined;
  initialReplacementTexts: Map<string, string> | undefined;
  initialReplacementImages: Map<string, string[]> | undefined;
  initialReplacementOriginalTexts: Map<string, string> | undefined;
}

const initialValueFromDraft = (
  draft: DraftPayload | null,
  reloadKey: number
): unknown[] | undefined => {
  if (reloadKey !== 0 || draft === null) return undefined;
  return draft.value;
};

const draftCommentInitial = (
  draft: DraftPayload | null,
  reloadKey: number
): Pick<
  InitialDraftSlice,
  | "initialBodies"
  | "initialImages"
  | "initialCommentOriginalTexts"
  | "initialSuggestionOriginalTexts"
> => ({
  initialBodies: draftInitialMap(draft?.commentBodies, reloadKey),
  initialImages: draftInitialMap(draft?.commentImages, reloadKey),
  initialCommentOriginalTexts: draftInitialMap(draft?.commentOriginalTexts, reloadKey),
  initialSuggestionOriginalTexts: draftInitialMap(draft?.suggestionOriginalTexts, reloadKey),
});

const draftInsertionInitial = (
  draft: DraftPayload | null,
  reloadKey: number
): Pick<
  InitialDraftSlice,
  "initialInsertionNewTexts" | "initialInsertionImages" | "initialInsertionOriginalTexts"
> => ({
  initialInsertionNewTexts: draftInitialMap(draft?.insertionNewTexts, reloadKey),
  initialInsertionImages: draftInitialMap(draft?.insertionImages, reloadKey),
  initialInsertionOriginalTexts: draftInitialMap(draft?.insertionOriginalTexts, reloadKey),
});

const draftReplacementInitial = (
  draft: DraftPayload | null,
  reloadKey: number
): Pick<
  InitialDraftSlice,
  "initialReplacementTexts" | "initialReplacementImages" | "initialReplacementOriginalTexts"
> => ({
  initialReplacementTexts: draftInitialMap(draft?.replacementTexts, reloadKey),
  initialReplacementImages: draftInitialMap(draft?.replacementImages, reloadKey),
  initialReplacementOriginalTexts: draftInitialMap(draft?.replacementOriginalTexts, reloadKey),
});

const draftInitial = (draft: DraftPayload | null, reloadKey: number): InitialDraftSlice => ({
  initialValue: initialValueFromDraft(draft, reloadKey),
  ...draftCommentInitial(draft, reloadKey),
  ...draftInsertionInitial(draft, reloadKey),
  ...draftReplacementInitial(draft, reloadKey),
});

/** Build a global comment, attaching `images` only when non-empty (keeps the persisted shape lean). */
const buildGlobalComment = (id: string, body: string, images: string[]): GlobalCommentEntry => {
  const entry: GlobalCommentEntry = { id, body };
  if (images.length > 0) entry.images = images;
  return entry;
};

/** Editable body + images of an annotation, used to prefill the edit composer. */
interface EditContent {
  body: string;
  images: string[];
}

/** The body + image maps for an anchored kind, from the editor handle (source of truth). */
const anchoredMaps = (
  handle: ReviewEditorHandle,
  kind: "comment" | "insertion" | "replacement"
): { body: Map<string, string>; images: Map<string, string[]> } => {
  if (kind === "comment")
    return { body: handle.getCommentBodies(), images: handle.getCommentImages() };
  if (kind === "insertion") {
    return { body: handle.getInsertionNewTexts(), images: handle.getInsertionImages() };
  }
  return { body: handle.getReplacementTexts(), images: handle.getReplacementImages() };
};

/** Prefill content for an anchored annotation, read from the handle maps. */
const anchoredEditContent = (
  handle: ReviewEditorHandle,
  kind: "comment" | "insertion" | "replacement",
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

/** Resolve the prefill content for an entry, reading anchored kinds from the handle. */
const resolveEditContent = (
  entry: AnnotationSidebarEntry,
  globalComments: GlobalCommentEntry[],
  handle: ReviewEditorHandle | null
): EditContent => {
  if (entry.kind === "global") return globalEditContent(globalComments, entry.id);
  if (entry.kind === "deletion" || handle === null) return { body: entry.body ?? "", images: [] };
  return anchoredEditContent(handle, entry.kind, entry.id);
};

/** Walk every annotation source on the handle into a flat entry list. */
const walkFromHandle = (
  handle: ReviewEditorHandle,
  globalComments: GlobalCommentEntry[]
): AnnotationEntry[] =>
  walkAnnotations({
    value: handle.getValue() as PlateValue,
    commentBodies: handle.getCommentBodies(),
    commentImages: handle.getCommentImages(),
    commentOriginalTexts: handle.getCommentOriginalTexts(),
    suggestionOriginalTexts: handle.getSuggestionOriginalTexts(),
    insertionNewTexts: handle.getInsertionNewTexts(),
    insertionImages: handle.getInsertionImages(),
    insertionOriginalTexts: handle.getInsertionOriginalTexts(),
    replacementTexts: handle.getReplacementTexts(),
    replacementImages: handle.getReplacementImages(),
    replacementOriginalTexts: handle.getReplacementOriginalTexts(),
    globalComments,
  });

const snapshotToDraft = (
  snapshot: EditorSnapshot,
  globalComments: GlobalCommentEntry[]
): Parameters<ReviewStateProps["saveDraft"]>[0] => ({
  value: snapshot.value,
  commentBodies: snapshot.commentBodies,
  commentImages: snapshot.commentImages,
  commentOriginalTexts: snapshot.commentOriginalTexts,
  suggestionOriginalTexts: snapshot.suggestionOriginalTexts,
  insertionNewTexts: snapshot.insertionNewTexts,
  insertionImages: snapshot.insertionImages,
  insertionOriginalTexts: snapshot.insertionOriginalTexts,
  replacementTexts: snapshot.replacementTexts,
  replacementImages: snapshot.replacementImages,
  replacementOriginalTexts: snapshot.replacementOriginalTexts,
  globalComments,
});

/**
 * Pure session state for the review screen: editor handle, global comments,
 * latest editor snapshot, and the reload counter that powers Clear-All.
 * Submission side-effects live in {@link useReviewSubmit}.
 */
export const useReviewState = ({ draft, saveDraft }: ReviewStateProps): ReviewState => {
  const [editorHandle, setEditorHandle] = useState<ReviewEditorHandle | null>(null);
  const [globalComments, setGlobalComments] = useState<GlobalCommentEntry[]>(
    () => draft?.globalComments ?? []
  );
  const [latestSnapshot, setLatestSnapshot] = useState<EditorSnapshot | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const onEditorChange = useCallback(
    (snapshot: EditorSnapshot): void => {
      setLatestSnapshot(snapshot);
      saveDraft(snapshotToDraft(snapshot, globalComments));
    },
    [globalComments, saveDraft]
  );

  const collectEntries = useCallback(
    (): AnnotationEntry[] =>
      editorHandle === null ? [] : walkFromHandle(editorHandle, globalComments),
    [editorHandle, globalComments]
  );

  const sidebarEntries = useMemo<AnnotationSidebarEntry[]>(() => {
    if (latestSnapshot !== null) {
      return projectEntries({ ...latestSnapshot, globalComments });
    }
    return projectWalkerEntries(collectEntries());
  }, [collectEntries, globalComments, latestSnapshot]);

  const onAddGlobalComment = useCallback((body: string, images: string[]): void => {
    setGlobalComments((prev) => [...prev, buildGlobalComment(crypto.randomUUID(), body, images)]);
  }, []);

  const onClearAll = useCallback((): void => {
    setGlobalComments([]);
    setLatestSnapshot(null);
    setReloadKey((prev) => prev + 1);
  }, []);

  // Commit a new global-comment list to state and persist it (when a snapshot
  // exists). Shared by the remove + update paths so both stay in lockstep.
  const commitGlobalComments = useCallback(
    (next: GlobalCommentEntry[]): void => {
      setGlobalComments(next);
      if (latestSnapshot !== null) saveDraft(snapshotToDraft(latestSnapshot, next));
    },
    [latestSnapshot, saveDraft]
  );

  const removeGlobalComment = useCallback(
    (id: string): void => commitGlobalComments(globalComments.filter((g) => g.id !== id)),
    [globalComments, commitGlobalComments]
  );

  const onRemoveAnnotation = useCallback(
    (entry: AnnotationSidebarEntry): void => {
      if (entry.kind === "global") {
        removeGlobalComment(entry.id);
        return;
      }
      editorHandle?.removeAnnotation(entry.kind, entry.id);
    },
    [editorHandle, removeGlobalComment]
  );

  const onUpdateGlobalComment = useCallback(
    (id: string, body: string, images: string[]): void =>
      commitGlobalComments(
        globalComments.map((g) => (g.id === id ? buildGlobalComment(id, body, images) : g))
      ),
    [globalComments, commitGlobalComments]
  );

  const onUpdateAnnotation = useCallback(
    (entry: AnnotationSidebarEntry, body: string, images: string[]): void => {
      if (entry.kind === "global") {
        onUpdateGlobalComment(entry.id, body, images);
        return;
      }
      if (entry.kind === "deletion") return;
      editorHandle?.updateAnnotation(entry.kind, entry.id, body, images);
    },
    [editorHandle, onUpdateGlobalComment]
  );

  const editContent = useCallback(
    (entry: AnnotationSidebarEntry): EditContent =>
      resolveEditContent(entry, globalComments, editorHandle),
    [globalComments, editorHandle]
  );

  return {
    editorHandle,
    sidebarEntries,
    ...draftInitial(draft, reloadKey),
    reloadKey,
    collectEntries,
    setEditorHandle,
    onEditorChange,
    onAddGlobalComment,
    onRemoveAnnotation,
    onUpdateAnnotation,
    editContent,
    onClearAll,
  };
};
