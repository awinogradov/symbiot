import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { Button } from "./components/Button.tsx";
import { Popover, PopoverAnchor, PopoverContent } from "./components/Popover.tsx";
import { Textarea } from "./components/Textarea.tsx";

interface GlobalCommentComposerProps {
  open: boolean;
  anchor: ReactNode;
  onSave: (body: string) => void;
  onCancel: () => void;
}

const submitKey = (
  event: KeyboardEvent<HTMLTextAreaElement>,
  save: () => void,
  cancel: () => void
): void => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    save();
  } else if (event.key === "Escape") {
    event.preventDefault();
    cancel();
  }
};

/** Top-bar-triggered Popover that captures a Global Comment body. Enter saves; Esc cancels. */
export const GlobalCommentComposer = ({
  open,
  anchor,
  onSave,
  onCancel,
}: GlobalCommentComposerProps): React.ReactElement => {
  const [body, setBody] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  const save = useCallback(() => {
    if (body.trim().length === 0) return;
    onSave(body.trim());
    setBody("");
  }, [body, onSave]);

  const cancel = useCallback(() => {
    onCancel();
    setBody("");
  }, [onCancel]);

  return (
    <Popover open={open} onOpenChange={(next) => !next && cancel()}>
      <PopoverAnchor asChild>{anchor}</PopoverAnchor>
      <PopoverContent data-testid="global-comment-composer">
        <Textarea
          ref={textareaRef}
          data-testid="global-composer-textarea"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Global feedback on the plan… (Enter to save, Esc to cancel)"
          onKeyDown={(e) => submitKey(e, save, cancel)}
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button data-testid="global-composer-cancel" variant="ghost" onClick={cancel}>
            Cancel
          </Button>
          <Button
            data-testid="global-composer-save"
            onClick={save}
            disabled={body.trim().length === 0}
          >
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
