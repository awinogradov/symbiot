import { buildImageUrl, type ImageRef } from "./ImageAttachButton.tsx";

interface ImagePreviewListProps {
  images: ImageRef[];
  onRemove: (ref: ImageRef) => void;
}

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
        <div
          key={ref}
          data-testid={`image-preview-${ref}`}
          className="border-border bg-card relative h-16 w-16 overflow-hidden rounded border"
        >
          <img src={buildImageUrl(ref)} alt="attached" className="h-full w-full object-cover" />
          <button
            type="button"
            data-testid={`image-preview-remove-${ref}`}
            onClick={(): void => onRemove(ref)}
            className="bg-background/80 absolute top-0 right-0 m-0.5 flex h-5 w-5 items-center justify-center rounded-full text-xs leading-none"
            aria-label="Remove image"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};
