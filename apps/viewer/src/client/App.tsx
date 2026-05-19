import { useCallback, useEffect, useState } from "react";
import {
  ReviewEditor,
  serializeFeedback,
  walkComments,
  type PlateValue,
  type ReviewEditorHandle,
} from "@symbiot/editor";
import { ThemeProvider, TopBar } from "@symbiot/ui";

import { fetchPlan, postApprove, postDeny, type PlanResponse } from "./api.ts";

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

  const onApprove = useCallback(async () => {
    setPhase("submitting");
    await postApprove();
    setPhase("done");
    window.close();
  }, []);

  const onDeny = useCallback(async () => {
    if (editorHandle === null) return;
    setPhase("submitting");
    const tuples = walkComments(
      editorHandle.getValue() as PlateValue,
      editorHandle.getCommentBodies()
    );
    await postDeny(serializeFeedback(tuples, plan.plan));
    setPhase("done");
    window.close();
  }, [editorHandle, plan.plan]);

  return (
    <div className="flex h-full flex-col">
      <TopBar onApprove={onApprove} onDeny={onDeny} busy={phase === "submitting"} />
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
