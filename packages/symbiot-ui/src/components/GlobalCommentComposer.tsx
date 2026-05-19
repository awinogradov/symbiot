import { useCallback } from "react";

import { ComposerForm, type ComposerPayload } from "./ComposerForm.tsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./Dialog.tsx";

/** Payload the host receives when the global composer saves. */
export type GlobalCommentComposerPayload = ComposerPayload;

interface GlobalCommentComposerProps {
  open: boolean;
  onSave: (payload: GlobalCommentComposerPayload) => void;
  onCancel: () => void;
}

/** Top-bar-triggered Dialog that captures a Global Comment body + images. */
export const GlobalCommentComposer = ({
  open,
  onSave,
  onCancel,
}: GlobalCommentComposerProps): React.ReactElement => {
  const onOpenChange = useCallback(
    (next: boolean): void => {
      if (!next) onCancel();
    },
    [onCancel]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="global-comment-composer" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Global comment</DialogTitle>
          <DialogDescription>Leave feedback that isn&apos;t tied to a selection.</DialogDescription>
        </DialogHeader>
        <ComposerForm
          open={open}
          placeholder="Global feedback on the plan… (Enter to save, Esc to cancel)"
          onSave={onSave}
          onCancel={onCancel}
          testId={{
            textarea: "global-composer-textarea",
            cancel: "global-composer-cancel",
            save: "global-composer-save",
          }}
        />
      </DialogContent>
    </Dialog>
  );
};
