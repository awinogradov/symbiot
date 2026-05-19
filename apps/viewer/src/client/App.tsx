import { useCallback, useEffect, useState } from "react";
import {
  ReviewEditor,
  serializeFeedback,
  walkAnnotations,
  type GlobalCommentEntry,
  type PlateValue,
  type ReviewEditorHandle,
} from "@symbiot/editor";
import { ThemeProvider, TopBar } from "@symbiot/ui";

import { fetchPlan, postApprove, postDeny, postFeedback, type PlanResponse } from "./api.ts";

type Phase = "loading" | "ready" | "submitting" | "done";

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
}

const ReviewScreen = ({ plan }: ReviewProps): React.ReactElement => {
  const [phase, setPhase] = useState<Phase>("ready");
  const [editorHandle, setEditorHandle] = useState<ReviewEditorHandle | null>(null);
  const [globalComments, setGlobalComments] = useState<GlobalCommentEntry[]>([]);

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
    setPhase("done");
    window.close();
  }, [buildFeedbackMarkdown, editorHandle, plan.mode]);

  const onAddGlobalComment = useCallback((body: string): void => {
    setGlobalComments((prev) => [...prev, { id: crypto.randomUUID(), body }]);
  }, []);

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
        <ReviewEditor markdown={plan.plan} onReady={setEditorHandle} />
      </main>
    </div>
  );
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
        <ReviewScreen plan={plan} />
      )}
    </ThemeProvider>
  );
};
