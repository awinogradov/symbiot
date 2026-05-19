import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { Button } from "./Button.tsx";
import { ImageAttachButton, type ImageRef } from "./ImageAttachButton.tsx";
import { ImagePreviewList } from "./ImagePreviewList.tsx";
import { Popover, PopoverAnchor, PopoverContent } from "./Popover.tsx";
import { Textarea } from "./Textarea.tsx";

/** Payload the host receives when the global composer saves. */
export interface GlobalCommentComposerPayload {
  body: string;
  images: ImageRef[];
}

interface GlobalCommentComposerProps {
  open: boolean;
  anchor: ReactNode;
  onSave: (payload: GlobalCommentComposerPayload) => void;
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

/** Top-bar-triggered Popover that captures a Global Comment body + images. */
export const GlobalCommentComposer = ({
  open,
  anchor,
  onSave,
  onCancel,
}: GlobalCommentComposerProps): React.ReactElement => {
  const [body, setBody] = useState("");
  const [images, setImages] = useState<ImageRef[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  const save = useCallback(() => {
    if (body.trim().length === 0 && images.length === 0) return;
    onSave({ body: body.trim(), images });
    setBody("");
    setImages([]);
  }, [body, images, onSave]);

  const cancel = useCallback(() => {
    onCancel();
    setBody("");
    setImages([]);
  }, [onCancel]);

  const onAttach = useCallback((ref: ImageRef): void => {
    setImages((prev) => [...prev, ref]);
  }, []);

  const onRemove = useCallback((ref: ImageRef): void => {
    setImages((prev) => prev.filter((r) => r !== ref));
  }, []);

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
        <ImagePreviewList images={images} onRemove={onRemove} />
        <div className="mt-2 flex items-center justify-between gap-2">
          <ImageAttachButton onAttach={onAttach} />
          <div className="flex gap-2">
            <Button data-testid="global-composer-cancel" variant="ghost" onClick={cancel}>
              Cancel
            </Button>
            <Button
              data-testid="global-composer-save"
              onClick={save}
              disabled={body.trim().length === 0 && images.length === 0}
            >
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
