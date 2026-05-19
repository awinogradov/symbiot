import { useCallback, useState } from "react";
import { serializeFeedback, type AnnotationEntry } from "@symbiot/annotations";
import { type ReviewEditorHandle } from "@symbiot/editor/components/ReviewEditor";

import { type ViewerMode } from "../../shared/apiTypes.ts";
import { deleteDraft, postApprove, postDeny, postFeedback } from "../libs/apiClient.ts";

/** Submission lifecycle phase: ready → submitting → done. */
export type Phase = "ready" | "submitting" | "done";

/** Inputs the submission hook needs from the surrounding review session. */
export interface ReviewSubmitProps {
  planMode: ViewerMode;
  editorHandle: ReviewEditorHandle | null;
  collectEntries: () => AnnotationEntry[];
  /** Stop the auto-save loop *before* the explicit DELETE so a queued POST can't resurrect the draft. */
  cancelDraft: () => void;
}

/** Phase signal + the two submission callbacks the `<TopBar>` wires up. */
export interface ReviewSubmit {
  phase: Phase;
  onApprove: () => Promise<void>;
  onSubmit: () => Promise<void>;
}

/**
 * Owns the side-effecting submission flow (approve / deny / feedback) and the
 * `phase` lifecycle that gates the UI. Sequence is always:
 * `cancelDraft → POST decision → DELETE draft → setPhase("done") → window.close`.
 */
export const useReviewSubmit = ({
  planMode,
  editorHandle,
  collectEntries,
  cancelDraft,
}: ReviewSubmitProps): ReviewSubmit => {
  const [phase, setPhase] = useState<Phase>("ready");

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
    const feedback = serializeFeedback(collectEntries());
    const submit = planMode === "annotate" ? postFeedback : postDeny;
    await submit(feedback);
    await deleteDraft().catch(() => undefined);
    setPhase("done");
    window.close();
  }, [cancelDraft, collectEntries, editorHandle, planMode]);

  return { phase, onApprove, onSubmit };
};
