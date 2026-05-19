import { useCallback, useMemo, useState } from "react";
import {
  serializeFeedback,
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

import {
  deleteDraft,
  postApprove,
  postDeny,
  postFeedback,
  type DraftPayload,
  type PlanResponse,
} from "../libs/api.ts";
import { projectEntries, toSidebarEntry } from "../utils/sidebarProjection.ts";

/** Submission lifecycle phase: ready → submitting → done. */
export type Phase = "ready" | "submitting" | "done";

const editorModeKey = "symbiot.editor-mode";

/** Read the persisted editor mode (review/redline) from `localStorage`; defaults to "review". */
const loadEditorMode = (): EditorMode => {
  if (typeof window === "undefined") return "review";
  const raw = window.localStorage.getItem(editorModeKey);
  return raw === "redline" ? "redline" : "review";
};

/** Inputs that bind the review session to its plan, draft, and draft I/O. */
export interface ReviewProps {
  plan: PlanResponse;
  draft: DraftPayload | null;
  saveDraft: (snapshot: {
    value: unknown[];
    commentBodies: Map<string, string>;
    commentImages: Map<string, string[]>;
    globalComments: GlobalCommentEntry[];
  }) => void;
  cancelDraft: () => void;
}

/** Everything the {@link ReviewScreen} renders or wires through to children. */
export interface ReviewState {
  phase: Phase;
  editorMode: EditorMode;
  sidebarEntries: AnnotationSidebarEntry[];
  initialValue: unknown[] | undefined;
  initialBodies: Map<string, string> | undefined;
  initialImages: Map<string, string[]> | undefined;
  reloadKey: number;
  setEditorHandle: (handle: ReviewEditorHandle) => void;
  onEditorModeChange: (next: EditorMode) => void;
  onEditorChange: (snapshot: EditorSnapshot) => void;
  onApprove: () => Promise<void>;
  onSubmit: () => Promise<void>;
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
 * Centralizes review-session state: phase, editor handle, global comments,
 * mode toggle, latest snapshot, and reload counter. Returns the props the
 * `<ReviewScreen>` distributes to its children.
 */
export const useReviewState = ({
  plan,
  draft,
  saveDraft,
  cancelDraft,
}: ReviewProps): ReviewState => {
  const [phase, setPhase] = useState<Phase>("ready");
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

  const buildFeedbackMarkdown = useCallback(
    (): string => serializeFeedback(collectEntries()),
    [collectEntries]
  );

  const onApprove = useCallback(async () => {
    setPhase("submitting");
    // Stop the auto-save loop FIRST: a queued POST /api/draft fired after the
    // DELETE below would re-create the draft and resurrect annotations on the
    // next plan-review session for the same slug.
    cancelDraft();
    await postApprove();
    await deleteDraft().catch(() => undefined);
    setPhase("done");
    window.close();
  }, [cancelDraft]);

  const onSubmit = useCallback(async () => {
    if (editorHandle === null) return;
    setPhase("submitting");
    cancelDraft();
    const feedback = buildFeedbackMarkdown();
    const submit = plan.mode === "annotate" ? postFeedback : postDeny;
    await submit(feedback);
    await deleteDraft().catch(() => undefined);
    setPhase("done");
    window.close();
  }, [buildFeedbackMarkdown, cancelDraft, editorHandle, plan.mode]);

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
    phase,
    editorMode,
    sidebarEntries,
    initialValue: reloadKey === 0 ? draft?.value : undefined,
    initialBodies: draftInitialMap(draft?.commentBodies, reloadKey),
    initialImages: draftInitialMap(draft?.commentImages, reloadKey),
    reloadKey,
    setEditorHandle,
    onEditorModeChange,
    onEditorChange,
    onApprove,
    onSubmit,
    onAddGlobalComment,
    onClearAll,
  };
};
