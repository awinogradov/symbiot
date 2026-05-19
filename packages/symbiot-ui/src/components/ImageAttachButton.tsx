import { useCallback, useRef, useState, type ChangeEvent, type ReactNode } from "react";

import { Button } from "./Button.tsx";

interface UploadResponse {
  id: string;
  extension: string;
}

/**
 * Encoded image reference as stored in the `CommentEntry.images` array.
 * Format: `${uuid}${extension}` (matches `/api/image?id=<uuid>&ext=<ext>`).
 */
export type ImageRef = string;

export const buildImageUrl = (ref: ImageRef): string => {
  const lastDot = ref.lastIndexOf(".");
  if (lastDot < 0) return `/api/image?id=${encodeURIComponent(ref)}&ext=`;
  const id = ref.slice(0, lastDot);
  const extension = ref.slice(lastDot);
  return `/api/image?id=${encodeURIComponent(id)}&ext=${encodeURIComponent(extension)}`;
};

interface ImageAttachButtonProps {
  onAttach: (ref: ImageRef) => void;
  disabled?: boolean;
  icon?: ReactNode;
}

const uploadFile = async (file: File): Promise<ImageRef> => {
  const form = new FormData();
  form.set("file", file);
  const response = await fetch("/api/upload", { method: "POST", body: form });
  if (!response.ok) {
    throw new Error(`upload failed: ${response.status}`);
  }
  const json = (await response.json()) as UploadResponse;
  return `${json.id}${json.extension}`;
};

export const ImageAttachButton = ({
  onAttach,
  disabled = false,
  icon,
}: ImageAttachButtonProps): React.ReactElement => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const onPick = useCallback((): void => {
    inputRef.current?.click();
  }, []);

  const onChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (file === undefined) return;
      setUploading(true);
      try {
        const ref = await uploadFile(file);
        onAttach(ref);
      } catch (error) {
        console.error("image upload failed", error);
      } finally {
        setUploading(false);
      }
    },
    [onAttach]
  );

  return (
    <>
      <input
        ref={inputRef}
        data-testid="image-attach-input"
        type="file"
        accept="image/*"
        hidden
        onChange={onChange}
      />
      <Button
        data-testid="image-attach-button"
        variant="ghost"
        size="sm"
        onClick={onPick}
        disabled={disabled || uploading}
      >
        {icon}
        {uploading ? "Uploading…" : "Attach image"}
      </Button>
    </>
  );
};
