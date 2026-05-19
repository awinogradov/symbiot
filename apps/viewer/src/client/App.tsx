import { useCallback, useEffect, useMemo, useState } from "react";
import {
  serializeFeedback,
  walkAnnotations,
  type AnnotationEntry,
  type GlobalCommentEntry,
  type PlateValue,
} from "@symbiot/annotations";
import { RedlineEditor } from "@symbiot/editor/components/RedlineEditor";
import {
  ReviewEditor,
  type EditorSnapshot,
  type ReviewEditorHandle,
} from "@symbiot/editor/components/ReviewEditor";
import {
  AnnotationSidebar,
  type AnnotationSidebarEntry,
} from "@symbiot/ui/components/AnnotationSidebar";
import { SidebarProvider } from "@symbiot/ui/components/Sidebar";
import { ThemeProvider } from "@symbiot/ui/components/ThemeProvider";
import { TopBar, type EditorMode } from "@symbiot/ui/components/TopBar";

import {
  deleteDraft,
  fetchPlan,
  postApprove,
  postDeny,
  postFeedback,
  type DraftPayload,
  type PlanResponse,
} from "./api.ts";
import { useDraft } from "./useDraft.ts";

type Phase = "ready" | "submitting" | "done";

const editorModeKey = "symbiot.editor-mode";

const loadEditorMode = (): EditorMode => {
  if (typeof window === "undefined") return "review";
  const raw = window.localStorage.getItem(editorModeKey);
  return raw === "redline" ? "redline" : "review";
};

const useLoadedPlan = (): PlanResponse | null => {
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  useEffect(() => {
    fetchPlan()
      .then(setPlan)
      .catch((error: unknown) => {
        console.error("failed to load plan", error);
      });
  }, []);
  return plan;
};

interface ReviewProps {
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

const toSidebarEntry = (entry: AnnotationEntry): AnnotationSidebarEntry => {
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

const focusAnnotation = (id: string): void => {
  const target = document.querySelector(`[data-anno-id="${id}"]`);
  if (target === null) return;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
};

interface SourceWindow {
  value: unknown[];
  commentBodies: Map<string, string>;
  commentImages: Map<string, string[]>;
  globalComments: GlobalCommentEntry[];
}

const projectEntries = (sources: SourceWindow): AnnotationSidebarEntry[] =>
  walkAnnotations({
    value: sources.value as PlateValue,
    commentBodies: sources.commentBodies,
    commentImages: sources.commentImages,
    globalComments: sources.globalComments,
  }).map(toSidebarEntry);

const draftInitialBodies = (
  draft: DraftPayload | null,
  reloadKey: number
): Map<string, string> | undefined => {
  if (reloadKey !== 0 || draft === null) return undefined;
  return new Map(Object.entries(draft.commentBodies));
};

const draftInitialImages = (
  draft: DraftPayload | null,
  reloadKey: number
): Map<string, string[]> | undefined => {
  if (reloadKey !== 0 || draft === null || draft.commentImages === undefined) return undefined;
  return new Map(Object.entries(draft.commentImages));
};

interface EditorMountProps {
  editorMode: EditorMode;
  reloadKey: number;
  plan: PlanResponse;
  initialValue: unknown[] | undefined;
  initialBodies: Map<string, string> | undefined;
  initialImages: Map<string, string[]> | undefined;
  onReady: (handle: ReviewEditorHandle) => void;
  onChange: (snapshot: EditorSnapshot) => void;
}

const EditorMount = ({
  editorMode,
  reloadKey,
  plan,
  initialValue,
  initialBodies,
  initialImages,
  onReady,
  onChange,
}: EditorMountProps): React.ReactElement => {
  if (editorMode === "review") {
    return (
      <ReviewEditor
        key={`review-${reloadKey}`}
        markdown={plan.plan}
        initialValue={initialValue}
        initialBodies={initialBodies}
        initialImages={initialImages}
        onReady={onReady}
        onChange={onChange}
      />
    );
  }
  return (
    <RedlineEditor
      key={`redline-${reloadKey}`}
      markdown={plan.plan}
      initialValue={initialValue}
      initialBodies={initialBodies}
      initialImages={initialImages}
      onReady={onReady}
      onChange={onChange}
    />
  );
};

interface ReviewState {
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

const useReviewState = ({ plan, draft, saveDraft, cancelDraft }: ReviewProps): ReviewState => {
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
    (): string => serializeFeedback(collectEntries(), plan.plan),
    [collectEntries, plan.plan]
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
    initialBodies: draftInitialBodies(draft, reloadKey),
    initialImages: draftInitialImages(draft, reloadKey),
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

const submittedHeading = (mode: PlanResponse["mode"]): string =>
  mode === "annotate" ? "Feedback submitted." : "Sent to the agent.";

interface SubmittedScreenProps {
  mode: PlanResponse["mode"];
}

const SubmittedScreen = ({ mode }: SubmittedScreenProps): React.ReactElement => (
  <div
    data-testid="submitted-screen"
    className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 text-sm"
  >
    <p className="text-foreground text-lg font-medium">{submittedHeading(mode)}</p>
    <p>You can close this window.</p>
  </div>
);

const ReviewScreen = ({ plan, draft, saveDraft, cancelDraft }: ReviewProps): React.ReactElement => {
  const state = useReviewState({ plan, draft, saveDraft, cancelDraft });
  const {
    phase,
    editorMode,
    sidebarEntries,
    initialValue,
    initialBodies,
    initialImages,
    reloadKey,
    setEditorHandle,
    onEditorModeChange,
    onEditorChange,
    onApprove,
    onSubmit,
    onAddGlobalComment,
    onClearAll,
  } = state;

  if (phase === "done") return <SubmittedScreen mode={plan.mode} />;

  return (
    <SidebarProvider>
      <div className="flex h-full flex-col">
        <TopBar
          onApprove={onApprove}
          onDeny={onSubmit}
          onAddGlobalComment={onAddGlobalComment}
          busy={phase === "submitting"}
          mode={plan.mode}
          editorMode={editorMode}
          onEditorModeChange={onEditorModeChange}
        />
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-auto px-8 py-6">
            <EditorMount
              editorMode={editorMode}
              reloadKey={reloadKey}
              plan={plan}
              initialValue={initialValue}
              initialBodies={initialBodies}
              initialImages={initialImages}
              onReady={setEditorHandle}
              onChange={onEditorChange}
            />
          </main>
          <AnnotationSidebar
            entries={sidebarEntries}
            onFocus={focusAnnotation}
            onClearAll={onClearAll}
          />
        </div>
      </div>
    </SidebarProvider>
  );
};

interface PlanLoadedProps {
  plan: PlanResponse;
}

const PlanLoaded = ({ plan }: PlanLoadedProps): React.ReactElement => {
  const {
    loaded: draft,
    isLoading: draftLoading,
    save: saveDraft,
    cancel: cancelDraft,
  } = useDraft();
  if (draftLoading) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center">
        Loading draft…
      </div>
    );
  }
  return <ReviewScreen plan={plan} draft={draft} saveDraft={saveDraft} cancelDraft={cancelDraft} />;
};

export const App = (): React.ReactElement => {
  const plan = useLoadedPlan();
  return (
    <ThemeProvider>
      {plan === null ? (
        <div className="text-muted-foreground flex h-full items-center justify-center">
          Loading plan…
        </div>
      ) : (
        <PlanLoaded plan={plan} />
      )}
    </ThemeProvider>
  );
};
