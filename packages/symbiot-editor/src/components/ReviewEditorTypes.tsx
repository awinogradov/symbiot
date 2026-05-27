import type { PlateValue } from "@symbiot/annotations";

/** Annotation kind that the host can remove via the editor handle. */
export type AnnotationHandleKind = "comment" | "deletion" | "insertion" | "replacement";

/** Imperative handle the host uses to read the current value and annotation maps. */
export interface ReviewEditorHandle {
  /** True when the editor has a non-empty selection that can host an annotation. */
  hasValidSelection: () => boolean;
  /** Triggers the same flow as the matching toolbar button click. No-op when selection is empty. */
  triggerAnnotation: (kind: AnnotationHandleKind) => void;
  getValue: () => unknown[];
  getCommentBodies: () => Map<string, string>;
  getCommentImages: () => Map<string, string[]>;
  /** `originalText` captured at comment creation; drives drift detection. */
  getCommentOriginalTexts: () => Map<string, string>;
  /** `originalText` captured at deletion creation; drives drift detection. */
  getSuggestionOriginalTexts: () => Map<string, string>;
  /** `newText` (the proposed insertion) captured at insertion creation. */
  getInsertionNewTexts: () => Map<string, string>;
  getInsertionImages: () => Map<string, string[]>;
  /** `contextText` snapshot captured at insertion creation; drives drift detection. */
  getInsertionOriginalTexts: () => Map<string, string>;
  /** `replacementText` (the proposed substitution) captured at replacement creation. */
  getReplacementTexts: () => Map<string, string>;
  getReplacementImages: () => Map<string, string[]>;
  /** `originalText` snapshot captured at replacement creation; drives drift detection. */
  getReplacementOriginalTexts: () => Map<string, string>;
  removeAnnotation: (kind: AnnotationHandleKind, id: string) => void;
}

/** Snapshot of the editor state surfaced via the onChange callback. */
export interface EditorSnapshot {
  value: PlateValue;
  commentBodies: Map<string, string>;
  commentImages: Map<string, string[]>;
  commentOriginalTexts: Map<string, string>;
  suggestionOriginalTexts: Map<string, string>;
  insertionNewTexts: Map<string, string>;
  insertionImages: Map<string, string[]>;
  insertionOriginalTexts: Map<string, string>;
  replacementTexts: Map<string, string>;
  replacementImages: Map<string, string[]>;
  replacementOriginalTexts: Map<string, string>;
}
