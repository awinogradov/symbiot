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
  InsertionEntry,
  InsertionTuple,
  PlateElementNode,
  PlateNode,
  PlateTextLeaf,
  PlateValue,
  ReplacementEntry,
  ReplacementTuple,
} from "./types.ts";
export {
  toCommentTuple,
  toDeletionTuple,
  toGlobalCommentTuple,
  toInsertionTuple,
  toReplacementTuple,
} from "./types.ts";
export {
  walkAnnotations,
  onlyComments,
  onlyDeletions,
  onlyGlobals,
  onlyInsertions,
  onlyReplacements,
  type AnnotationSources,
} from "./walkAnnotations.ts";
export { encodeAnnotations } from "./encode.ts";
export { decodeAnnotations } from "./decode.ts";
export { resolveAnchor, type AnchorResolution, type DualAnchor } from "./dualAnchor.ts";
export { serializeFeedback } from "./serializeFeedback.ts";
