import { useCallback, useEffect, useState } from "react";
import {
  ReviewEditor,
  serializeFeedback,
  walkAnnotations,
  type EditorSnapshot,
  type GlobalCommentEntry,
  type PlateValue,
  type ReviewEditorHandle,
} from "@symbiot/editor";
import { ThemeProvider, TopBar } from "@symbiot/ui";

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
    globalComments: GlobalCommentEntry[];
  }) => void;
}

const ReviewScreen = ({ plan, draft, saveDraft }: ReviewProps): React.ReactElement => {
  const [phase, setPhase] = useState<Phase>("ready");
  const [editorHandle, setEditorHandle] = useState<ReviewEditorHandle | null>(null);
  const [globalComments, setGlobalComments] = useState<GlobalCommentEntry[]>(
    () => draft?.globalComments ?? []
  );

  const onEditorChange = useCallback(
    (snapshot: EditorSnapshot): void => {
      saveDraft({
        value: snapshot.value,
        commentBodies: snapshot.commentBodies,
        globalComments,
      });
    },
    [globalComments, saveDraft]
  );

  const buildFeedbackMarkdown = useCallback((): string => {
    if (editorHandle === null) return "";
    const entries = walkAnnotations({
      value: editorHandle.getValue() as PlateValue,
      commentBodies: editorHandle.getCommentBodies(),
      globalComments,
    });
    return serializeFeedback(entries, plan.plan);
  }, [editorHandle, globalComments, plan.plan]);

  const onApprove = useCallback(async () => {
    setPhase("submitting");
    await postApprove();
    await deleteDraft().catch(() => undefined);
    setPhase("done");
    window.close();
  }, []);

  const onSubmit = useCallback(async () => {
    if (editorHandle === null) return;
    setPhase("submitting");
    const feedback = buildFeedbackMarkdown();
    if (plan.mode === "annotate") {
      await postFeedback(feedback);
    } else {
      await postDeny(feedback);
    }
    await deleteDraft().catch(() => undefined);
    setPhase("done");
    window.close();
  }, [buildFeedbackMarkdown, editorHandle, plan.mode]);

  const onAddGlobalComment = useCallback((body: string): void => {
    setGlobalComments((prev) => [...prev, { id: crypto.randomUUID(), body }]);
  }, []);

  const initialValue = draft?.value;
  const initialBodies = draft === null ? undefined : new Map(Object.entries(draft.commentBodies));

  return (
    <div className="flex h-full flex-col">
      <TopBar
        onApprove={onApprove}
        onDeny={onSubmit}
        onAddGlobalComment={onAddGlobalComment}
        busy={phase === "submitting"}
        mode={plan.mode}
      />
      <main className="flex-1 overflow-auto px-8 py-6">
        <ReviewEditor
          markdown={plan.plan}
          initialValue={initialValue}
          initialBodies={initialBodies}
          onReady={setEditorHandle}
          onChange={onEditorChange}
        />
      </main>
    </div>
  );
};

interface PlanLoadedProps {
  plan: PlanResponse;
}

const PlanLoaded = ({ plan }: PlanLoadedProps): React.ReactElement => {
  const { loaded: draft, isLoading: draftLoading, save: saveDraft } = useDraft();
  if (draftLoading) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center">
        Loading draft…
      </div>
    );
  }
  return <ReviewScreen plan={plan} draft={draft} saveDraft={saveDraft} />;
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
