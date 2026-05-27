import type { ReactNode } from "react";

interface ImageNode {
  url?: string;
  alt?: string;
}

interface VoidImageProps {
  attributes: Record<string, unknown>;
  children: ReactNode;
  element: ImageNode;
}

/**
 * Plate `img` void element renderer. Same React 19 / Slate-React pattern as
 * `HrElement`: wrap in a block so the void HTML `<img>` doesn't try to receive
 * Slate's zero-width text child. Source URLs come either from `remark-gfm`
 * deserialize of `![alt](url)` syntax or from `/api/upload` UUIDs threaded
 * into the editor by the composer image-attach flow.
 */
export const VoidImage = ({
  attributes,
  children,
  element,
}: VoidImageProps): React.ReactElement => (
  <div {...attributes} contentEditable={false} className="my-3">
    {element.url !== undefined && (
      <img
        src={element.url}
        alt={element.alt ?? ""}
        className="border-border max-w-full rounded-md border"
      />
    )}
    <span className="hidden">{children}</span>
  </div>
);
