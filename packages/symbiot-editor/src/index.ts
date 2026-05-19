export { SymbiotEditorKit } from "./kit.ts";
export { ReviewEditor, type ReviewEditorHandle, type EditorSnapshot } from "./ReviewEditor.tsx";
export { RedlineEditor } from "./RedlineEditor.tsx";
export { applyComment, type AppliedComment } from "./applyComment.ts";
export { applyDeletion, type AppliedDeletion } from "./applyDeletion.ts";
export { walkComments, walkAnnotations, serializeFeedback } from "@symbiot/annotations";
export type {
  AnnotationEntry,
  AnnotationTuple,
  CommentEntry,
  CommentTuple,
  DeletionEntry,
  DeletionTuple,
  GlobalCommentEntry,
  GlobalCommentTuple,
  PlateValue,
} from "@symbiot/annotations";
