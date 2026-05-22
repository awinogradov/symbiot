import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";

import { Button } from "./Button.tsx";
import { ImageAttachButton, type ImageRef } from "./ImageAttachButton.tsx";
import { ImagePreviewList } from "./ImagePreviewList.tsx";
import { Textarea } from "./Textarea.tsx";

/** Payload emitted by `<ComposerForm>` when the reviewer hits Save. */
export interface ComposerPayload {
  body: string;
  images: ImageRef[];
}

interface ComposerFormProps {
  open: boolean;
  placeholder: string;
  onSave: (payload: ComposerPayload) => void;
  onCancel: () => void;
  testId?: { textarea: string; cancel: string; save: string };
}

/**
 * Shared body/images/Save/Cancel block used by the polymorphic
 * `AnnotationComposer` dialog (selection-anchored or global). Auto-focuses the
 * textarea on `open`; Enter saves, Shift+Enter newlines, Esc cancels.
 */
export const ComposerForm = ({
  open,
  placeholder,
  onSave,
  onCancel,
  testId,
}: ComposerFormProps): React.ReactElement => {
  const [body, setBody] = useState("");
  const [images, setImages] = useState<ImageRef[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  const save = useCallback((): void => {
    if (body.trim().length === 0 && images.length === 0) return;
    onSave({ body: body.trim(), images });
    setBody("");
    setImages([]);
  }, [body, images, onSave]);

  const cancel = useCallback((): void => {
    setBody("");
    setImages([]);
    onCancel();
  }, [onCancel]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>): void => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        save();
      } else if (event.key === "Escape") {
        event.preventDefault();
        cancel();
      }
    },
    [save, cancel]
  );

  const onAttach = useCallback((ref: ImageRef): void => {
    setImages((prev) => [...prev, ref]);
  }, []);

  const onRemove = useCallback((ref: ImageRef): void => {
    setImages((prev) => prev.filter((r) => r !== ref));
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        ref={textareaRef}
        data-testid={testId?.textarea}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        onKeyDown={onKeyDown}
        className="min-h-40 sm:min-h-48"
      />
      <ImagePreviewList images={images} onRemove={onRemove} />
      <div className="flex items-center justify-between gap-2">
        <ImageAttachButton onAttach={onAttach} />
        <div className="flex gap-2">
          <Button data-testid={testId?.cancel} variant="ghost" size="sm" onClick={cancel}>
            Cancel
          </Button>
          <Button
            data-testid={testId?.save}
            size="sm"
            onClick={save}
            disabled={body.trim().length === 0 && images.length === 0}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};
