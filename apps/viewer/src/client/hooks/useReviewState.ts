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
import { type AnnotationSidebarEntry } from "@symbiot/ui/components/AnnotationSidebar";

import { type DraftPayload } from "../../shared/apiTypes.ts";
import { projectEntries, toSidebarEntry } from "../utils/sidebarProjection.ts";

/** Inputs that bind the review session to its loaded plan and persisted draft. */
export interface ReviewStateProps {
  draft: DraftPayload | null;
  saveDraft: (snapshot: {
    value: unknown[];
    commentBodies: Map<string, string>;
    commentImages: Map<string, string[]>;
    commentOriginalTexts: Map<string, string>;
    suggestionOriginalTexts: Map<string, string>;
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
  reloadKey: number;
  collectEntries: () => AnnotationEntry[];
  setEditorHandle: (handle: ReviewEditorHandle) => void;
  onEditorChange: (snapshot: EditorSnapshot) => void;
  onAddGlobalComment: (body: string, images: string[]) => void;
  onRemoveAnnotation: (entry: AnnotationSidebarEntry) => void;
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
}

const initialValueFromDraft = (
  draft: DraftPayload | null,
  reloadKey: number
): unknown[] | undefined => {
  if (reloadKey !== 0 || draft === null) return undefined;
  return draft.value;
};

const draftInitial = (draft: DraftPayload | null, reloadKey: number): InitialDraftSlice => ({
  initialValue: initialValueFromDraft(draft, reloadKey),
  initialBodies: draftInitialMap(draft?.commentBodies, reloadKey),
  initialImages: draftInitialMap(draft?.commentImages, reloadKey),
  initialCommentOriginalTexts: draftInitialMap(draft?.commentOriginalTexts, reloadKey),
  initialSuggestionOriginalTexts: draftInitialMap(draft?.suggestionOriginalTexts, reloadKey),
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
      saveDraft({
        value: snapshot.value,
        commentBodies: snapshot.commentBodies,
        commentImages: snapshot.commentImages,
        commentOriginalTexts: snapshot.commentOriginalTexts,
        suggestionOriginalTexts: snapshot.suggestionOriginalTexts,
        globalComments,
      });
    },
    [globalComments, saveDraft]
  );

  const collectEntries = useCallback((): AnnotationEntry[] => {
    if (editorHandle === null) return [];
    return walkAnnotations({
      value: editorHandle.getValue() as PlateValue,
      commentBodies: editorHandle.getCommentBodies(),
      commentImages: editorHandle.getCommentImages(),
      commentOriginalTexts: editorHandle.getCommentOriginalTexts(),
      suggestionOriginalTexts: editorHandle.getSuggestionOriginalTexts(),
      globalComments,
    });
  }, [editorHandle, globalComments]);

  const sidebarEntries = useMemo<AnnotationSidebarEntry[]>(() => {
    if (latestSnapshot !== null) {
      return projectEntries({ ...latestSnapshot, globalComments });
    }
    return collectEntries().map(toSidebarEntry);
  }, [collectEntries, globalComments, latestSnapshot]);

  const onAddGlobalComment = useCallback((body: string, images: string[]): void => {
    const entry: GlobalCommentEntry = { id: crypto.randomUUID(), body };
    if (images.length > 0) entry.images = images;
    setGlobalComments((prev) => [...prev, entry]);
  }, []);

  const onClearAll = useCallback((): void => {
    setGlobalComments([]);
    setLatestSnapshot(null);
    setReloadKey((prev) => prev + 1);
  }, []);

  const removeGlobalComment = useCallback(
    (id: string): void => {
      const next = globalComments.filter((g) => g.id !== id);
      setGlobalComments(next);
      if (latestSnapshot === null) return;
      saveDraft({
        value: latestSnapshot.value,
        commentBodies: latestSnapshot.commentBodies,
        commentImages: latestSnapshot.commentImages,
        commentOriginalTexts: latestSnapshot.commentOriginalTexts,
        suggestionOriginalTexts: latestSnapshot.suggestionOriginalTexts,
        globalComments: next,
      });
    },
    [globalComments, latestSnapshot, saveDraft]
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
    onClearAll,
  };
};
