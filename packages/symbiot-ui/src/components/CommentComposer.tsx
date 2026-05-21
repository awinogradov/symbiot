import { useCallback } from "react";

import { ComposerForm, type ComposerPayload } from "./ComposerForm.tsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./Dialog.tsx";

/** Payload the host receives when the composer saves. */
export type CommentComposerPayload = ComposerPayload;

interface CommentComposerProps {
  open: boolean;
  /** Selected text rendered as a quote above the textarea. */
  quote: string;
  onSave: (payload: CommentComposerPayload) => void;
  onCancel: () => void;
}

/** Modal Dialog that captures a comment body + optional images for a text selection. */
export const CommentComposer = ({
  open,
  quote,
  onSave,
  onCancel,
}: CommentComposerProps): React.ReactElement => {
  const onOpenChange = useCallback(
    (next: boolean): void => {
      if (!next) onCancel();
    },
    [onCancel]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="comment-composer" className="sm:max-w-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Comment on selection</DialogTitle>
          <DialogDescription>Add a comment to the selected text.</DialogDescription>
        </DialogHeader>
        <blockquote
          data-testid="composer-quote"
          className="border-anno-comment text-anno-comment bg-anno-comment/10 line-clamp-4 rounded-sm border-l-2 py-1 pl-3 text-sm whitespace-pre-wrap italic"
        >
          {quote}
        </blockquote>
        <ComposerForm
          open={open}
          placeholder="Comment on this selection… (Enter to save, Esc to cancel)"
          onSave={onSave}
          onCancel={onCancel}
          testId={{
            textarea: "composer-textarea",
            cancel: "composer-cancel",
            save: "composer-save",
          }}
        />
      </DialogContent>
    </Dialog>
  );
};
