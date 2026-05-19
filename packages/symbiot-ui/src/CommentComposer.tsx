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

interface CommentComposerProps {
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

/** Selection-anchored Popover that captures a comment body. Enter saves; Esc cancels. */
export const CommentComposer = ({
  open,
  anchor,
  onSave,
  onCancel,
}: CommentComposerProps): React.ReactElement => {
  const [body, setBody] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  const save = useCallback(() => {
    if (body.trim().length > 0) onSave(body.trim());
  }, [body, onSave]);

  return (
    <Popover open={open} onOpenChange={(next) => !next && onCancel()}>
      <PopoverAnchor asChild>{anchor}</PopoverAnchor>
      <PopoverContent>
        <Textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Comment on this selection… (Enter to save, Esc to cancel)"
          onKeyDown={(e) => submitKey(e, save, onCancel)}
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={save} disabled={body.trim().length === 0}>
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
