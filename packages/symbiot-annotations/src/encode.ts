import type { AnnotationEntry, AnnotationTuple } from "./types.ts";
import { toCommentTuple, toDeletionTuple, toGlobalCommentTuple } from "./types.ts";

const encodeOne = (entry: AnnotationEntry): AnnotationTuple => {
  switch (entry.kind) {
    case "comment":
      return toCommentTuple(entry);
    case "global":
      return toGlobalCommentTuple(entry);
    case "deletion":
      return toDeletionTuple(entry);
  }
};

/**
 * Encode a list of walked annotations into their plannotator-compatible tuple
 * forms. Order is preserved so callers can rely on document-order semantics for
 * Comment / Deletion entries and append-order for Global Comments.
 */
export const encodeAnnotations = (entries: AnnotationEntry[]): AnnotationTuple[] =>
  entries.map(encodeOne);
