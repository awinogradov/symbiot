/**
 * Draft-mode submission flow: "Send to agent" persists the edited body as the
 * next version and resolves the session with a `draft` decision; "Approve"
 * persists it and resolves `approve` — both serialize the Plate value to
 * markdown once, at submit time. Sequence mirrors the review submit hook:
 * `cancelDraft → POST decision → DELETE draft → phase "done" → window.close`.
 */
import { useCallback, useState } from "react";
import { type DraftEditorHandle } from "@symbiot/editor/components/DraftEditor";

import { deleteDraft, postApprove, postDraftSend } from "../libs/apiClient.ts";

import { type Phase } from "./useReviewSubmit.ts";

/** Which draft outcome was submitted — drives the confirmation heading. */
export type DraftOutcome = "sent" | "approved";

/** Inputs the draft submission hook needs from the surrounding session. */
export interface DraftSubmitProps {
  editorHandle: DraftEditorHandle | null;
  /** Stop the auto-save loop *before* the explicit DELETE so a queued POST can't resurrect the draft. */
  cancelDraft: () => void;
}

/** Phase signal, submitted outcome, and the two actions the `<TopBar>` wires up. */
export interface DraftSubmit {
  phase: Phase;
  outcome: DraftOutcome;
  onSend: () => Promise<void>;
  onApprove: () => Promise<void>;
}

export const useDraftSubmit = ({ editorHandle, cancelDraft }: DraftSubmitProps): DraftSubmit => {
  const [phase, setPhase] = useState<Phase>("ready");
  const [outcome, setOutcome] = useState<DraftOutcome>("sent");

  const submit = useCallback(
    async (kind: DraftOutcome): Promise<void> => {
      if (editorHandle === null) return;
      setPhase("submitting");
      cancelDraft();
      const markdown = editorHandle.getMarkdown();
      await (kind === "sent" ? postDraftSend(markdown) : postApprove(markdown));
      await deleteDraft().catch(() => undefined);
      setOutcome(kind);
      setPhase("done");
      window.close();
    },
    [cancelDraft, editorHandle]
  );

  const onSend = useCallback(() => submit("sent"), [submit]);
  const onApprove = useCallback(() => submit("approved"), [submit]);

  return { phase, outcome, onSend, onApprove };
};
