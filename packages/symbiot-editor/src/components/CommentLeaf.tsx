import { createAnnotationLeaf } from "./createAnnotationLeaf.tsx";

/**
 * Leaf renderer for the `comment` mark applied by `applyComment`. Wraps the
 * anchored text in a semantic `<mark>` with orange text + transparent orange
 * background so commented spans read as a visual diff. The per-comment
 * `comment_<id>` marks stay orthogonal and are not styled here.
 */
export const CommentLeaf = createAnnotationLeaf(
  "mark",
  "text-anno-comment bg-anno-comment/10 rounded-sm px-0.5",
  "CommentLeaf",
  "annotation-comment"
);
