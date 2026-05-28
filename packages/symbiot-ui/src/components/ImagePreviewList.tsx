import { useCallback } from "react";

import { buildImageUrl, type ImageRef } from "./ImageAttachButton.tsx";

/** Props for the composer's attached-image thumbnail strip. */
interface ImagePreviewListProps {
  /** Currently attached refs, rendered in insertion order. */
  images: ImageRef[];
  /** Invoked with the ref the reviewer clicked the remove button on. */
  onRemove: (ref: ImageRef) => void;
}

/** Internal per-thumbnail props for {@link ImagePreviewListProps}. */
interface ImagePreviewItemProps {
  imageRef: ImageRef;
  onRemove: (ref: ImageRef) => void;
}

const ImagePreviewItem = ({ imageRef, onRemove }: ImagePreviewItemProps): React.ReactElement => {
  const handleRemove = useCallback((): void => onRemove(imageRef), [imageRef, onRemove]);
  return (
    <div
      data-testid={`image-preview-${imageRef}`}
      className="border-border bg-card relative h-16 w-16 overflow-hidden rounded border"
    >
      <img
        src={buildImageUrl(imageRef)}
        alt="attached"
        data-testid="image-preview-img"
        className="h-full w-full object-cover"
      />
      <button
        type="button"
        data-testid={`image-preview-remove-${imageRef}`}
        onClick={handleRemove}
        className="bg-background/80 absolute top-0 right-0 m-0.5 flex h-5 w-5 items-center justify-center rounded-full text-xs leading-none"
        aria-label="Remove image"
      >
        ×
      </button>
    </div>
  );
};

/**
 * Thumbnail strip for the composer's attached images. Each thumb has an inline
 * remove button. Keeps the row empty (zero DOM) when there's nothing attached
 * so the composer doesn't grow until the user actually picks an image.
 */
export const ImagePreviewList = ({
  images,
  onRemove,
}: ImagePreviewListProps): React.ReactElement | null => {
  if (images.length === 0) return null;
  return (
    <div data-testid="image-preview-list" className="mt-2 flex flex-wrap gap-2">
      {images.map((ref) => (
        <ImagePreviewItem key={ref} imageRef={ref} onRemove={onRemove} />
      ))}
    </div>
  );
};
