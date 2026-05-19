import type {
  AnnotationEntry,
  AnnotationTuple,
  CommentTuple,
  DeletionTuple,
  GlobalCommentTuple,
} from "./types.ts";

const decodeComment = (tuple: CommentTuple, index: number): AnnotationEntry => {
  const [, originalText, body, author, images] = tuple;
  const entry: AnnotationEntry = {
    kind: "comment",
    id: `c-${index}`,
    originalText,
    body,
  };
  if (author !== undefined && author.length > 0) entry.author = author;
  if (images !== undefined) entry.images = images;
  return entry;
};

const decodeGlobal = (tuple: GlobalCommentTuple, index: number): AnnotationEntry => {
  const [, body, author, images] = tuple;
  const entry: AnnotationEntry = { kind: "global", id: `g-${index}`, body };
  if (author !== undefined && author.length > 0) entry.author = author;
  if (images !== undefined) entry.images = images;
  return entry;
};

const decodeDeletion = (tuple: DeletionTuple, index: number): AnnotationEntry => {
  const [, originalText, author, images] = tuple;
  const entry: AnnotationEntry = { kind: "deletion", id: `d-${index}`, originalText };
  if (author !== undefined && author.length > 0) entry.author = author;
  if (images !== undefined) entry.images = images;
  return entry;
};

/**
 * Decode a list of plannotator-compatible tuples back into AnnotationEntry
 * objects. Ids are synthesized from the tuple position since the wire format
 * doesn't carry them. Callers that need to re-attach anchors should pair this
 * output with `dualAnchor.resolveAnchor` against the current Plate value.
 */
export const decodeAnnotations = (tuples: AnnotationTuple[]): AnnotationEntry[] =>
  tuples.map((tuple, i) => {
    switch (tuple[0]) {
      case "C":
        return decodeComment(tuple, i);
      case "G":
        return decodeGlobal(tuple, i);
      case "D":
        return decodeDeletion(tuple, i);
    }
  });
