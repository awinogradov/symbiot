export type {
  AnnotationEntry,
  AnnotationTuple,
  BlockLines,
  CommentEntry,
  CommentTuple,
  DeletionEntry,
  DeletionTuple,
  GlobalCommentEntry,
  GlobalCommentTuple,
  PlateElementNode,
  PlateNode,
  PlateTextLeaf,
  PlateValue,
} from "./types.ts";
export { toCommentTuple, toDeletionTuple, toGlobalCommentTuple } from "./types.ts";
export {
  walkAnnotations,
  onlyComments,
  onlyDeletions,
  onlyGlobals,
  type AnnotationSources,
} from "./walkAnnotations.ts";
export { encodeAnnotations } from "./encode.ts";
export { decodeAnnotations } from "./decode.ts";
export { resolveAnchor, type AnchorResolution, type DualAnchor } from "./dualAnchor.ts";
export { serializeFeedback } from "./serializeFeedback.ts";
