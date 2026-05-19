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
import { type EditorMode } from "@symbiot/ui/components/TopBar";

import { type DraftPayload } from "../../shared/apiTypes.ts";
import { projectEntries, toSidebarEntry } from "../utils/sidebarProjection.ts";

const editorModeKey = "symbiot.editor-mode";

/** Read the persisted editor mode (review/redline) from `localStorage`; defaults to "review". */
const loadEditorMode = (): EditorMode => {
  if (typeof window === "undefined") return "review";
  const raw = window.localStorage.getItem(editorModeKey);
  return raw === "redline" ? "redline" : "review";
};

/** Inputs that bind the review session to its loaded plan and persisted draft. */
export interface ReviewStateProps {
  draft: DraftPayload | null;
  saveDraft: (snapshot: {
    value: unknown[];
    commentBodies: Map<string, string>;
    commentImages: Map<string, string[]>;
    globalComments: GlobalCommentEntry[];
  }) => void;
}

/** Everything the `<ReviewScreen>` renders or wires through to children. */
export interface ReviewState {
  editorHandle: ReviewEditorHandle | null;
  editorMode: EditorMode;
  sidebarEntries: AnnotationSidebarEntry[];
  initialValue: unknown[] | undefined;
  initialBodies: Map<string, string> | undefined;
  initialImages: Map<string, string[]> | undefined;
  reloadKey: number;
  collectEntries: () => AnnotationEntry[];
  setEditorHandle: (handle: ReviewEditorHandle) => void;
  onEditorModeChange: (next: EditorMode) => void;
  onEditorChange: (snapshot: EditorSnapshot) => void;
  onAddGlobalComment: (body: string, images: string[]) => void;
  onClearAll: () => void;
}

const draftInitialMap = <V>(
  source: Record<string, V> | undefined,
  reloadKey: number
): Map<string, V> | undefined => {
  if (reloadKey !== 0 || source === undefined) return undefined;
  return new Map(Object.entries(source));
};

/**
 * Pure session state for the review screen: editor handle, mode, global
 * comments, latest editor snapshot, and the reload counter that powers
 * Clear-All. Submission side-effects live in {@link useReviewSubmit}.
 */
export const useReviewState = ({ draft, saveDraft }: ReviewStateProps): ReviewState => {
  const [editorHandle, setEditorHandle] = useState<ReviewEditorHandle | null>(null);
  const [globalComments, setGlobalComments] = useState<GlobalCommentEntry[]>(
    () => draft?.globalComments ?? []
  );
  const [editorMode, setEditorMode] = useState<EditorMode>(loadEditorMode);
  const [latestSnapshot, setLatestSnapshot] = useState<EditorSnapshot | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const onEditorModeChange = useCallback((next: EditorMode): void => {
    setEditorMode(next);
    window.localStorage.setItem(editorModeKey, next);
  }, []);

  const onEditorChange = useCallback(
    (snapshot: EditorSnapshot): void => {
      setLatestSnapshot(snapshot);
      saveDraft({
        value: snapshot.value,
        commentBodies: snapshot.commentBodies,
        commentImages: snapshot.commentImages,
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

  return {
    editorHandle,
    editorMode,
    sidebarEntries,
    initialValue: reloadKey === 0 ? draft?.value : undefined,
    initialBodies: draftInitialMap(draft?.commentBodies, reloadKey),
    initialImages: draftInitialMap(draft?.commentImages, reloadKey),
    reloadKey,
    collectEntries,
    setEditorHandle,
    onEditorModeChange,
    onEditorChange,
    onAddGlobalComment,
    onClearAll,
  };
};
