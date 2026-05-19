import { useCallback, type ReactNode } from "react";

import { ComposerForm, type ComposerPayload } from "./ComposerForm.tsx";
import { Popover, PopoverAnchor, PopoverContent } from "./Popover.tsx";

/** Payload the host receives when the composer saves. */
export type CommentComposerPayload = ComposerPayload;

interface CommentComposerProps {
  open: boolean;
  anchor: ReactNode;
  onSave: (payload: CommentComposerPayload) => void;
  onCancel: () => void;
}

/** Selection-anchored Popover that captures a comment body + optional images. */
export const CommentComposer = ({
  open,
  anchor,
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
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>{anchor}</PopoverAnchor>
      <PopoverContent data-testid="comment-composer" align="start" className="w-80">
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
      </PopoverContent>
    </Popover>
  );
};
