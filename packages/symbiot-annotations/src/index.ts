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
  TaskToggleEntry,
  TaskToggleTuple,
} from "./types.ts";
export {
  toCommentTuple,
  toDeletionTuple,
  toGlobalCommentTuple,
  toInsertionTuple,
  toReplacementTuple,
  toTaskToggleTuple,
} from "./types.ts";
export {
  walkAnnotations,
  onlyComments,
  onlyDeletions,
  onlyGlobals,
  onlyInsertions,
  onlyReplacements,
  onlyTasks,
  type AnnotationSources,
} from "./walkAnnotations.ts";
export { encodeAnnotations } from "./encode.ts";
export { decodeAnnotations } from "./decode.ts";
export { resolveAnchor, type AnchorResolution, type DualAnchor } from "./dualAnchor.ts";
export { serializeFeedback } from "./serializeFeedback.ts";
export {
  serialize,
  deserialize,
  encrypt,
  decrypt,
  isShareSupported,
  type EncryptedShare,
  type SymbiotDocument,
  type SymbiotDocumentMeta,
} from "./share.ts";
