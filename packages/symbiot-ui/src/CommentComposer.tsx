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
import { ImageAttachButton, type ImageRef } from "./ImageAttachButton.tsx";
import { ImagePreviewList } from "./ImagePreviewList.tsx";

/** Payload the host receives when the composer saves. */
export interface CommentComposerPayload {
  body: string;
  images: ImageRef[];
}

interface CommentComposerProps {
  open: boolean;
  anchor: ReactNode;
  onSave: (payload: CommentComposerPayload) => void;
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

/** Selection-anchored Popover that captures a comment body + optional images. */
export const CommentComposer = ({
  open,
  anchor,
  onSave,
  onCancel,
}: CommentComposerProps): React.ReactElement => {
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

  const onAttach = useCallback((ref: ImageRef): void => {
    setImages((prev) => [...prev, ref]);
  }, []);

  const onRemove = useCallback((ref: ImageRef): void => {
    setImages((prev) => prev.filter((r) => r !== ref));
  }, []);

  const onCancelInternal = useCallback((): void => {
    setBody("");
    setImages([]);
    onCancel();
  }, [onCancel]);

  return (
    <Popover open={open} onOpenChange={(next) => !next && onCancelInternal()}>
      <PopoverAnchor asChild>{anchor}</PopoverAnchor>
      <PopoverContent data-testid="comment-composer">
        <Textarea
          ref={textareaRef}
          data-testid="composer-textarea"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Comment on this selection… (Enter to save, Esc to cancel)"
          onKeyDown={(e) => submitKey(e, save, onCancelInternal)}
        />
        <ImagePreviewList images={images} onRemove={onRemove} />
        <div className="mt-2 flex items-center justify-between gap-2">
          <ImageAttachButton onAttach={onAttach} />
          <div className="flex gap-2">
            <Button data-testid="composer-cancel" variant="ghost" onClick={onCancelInternal}>
              Cancel
            </Button>
            <Button
              data-testid="composer-save"
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
