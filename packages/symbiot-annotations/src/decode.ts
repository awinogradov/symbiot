import type {
  AnnotationEntry,
  AnnotationTuple,
  CommentTuple,
  DeletionTuple,
  GlobalCommentTuple,
  InsertionTuple,
  ReplacementTuple,
  TaskToggleTuple,
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

const decodeInsertion = (tuple: InsertionTuple, index: number): AnnotationEntry => {
  const [, contextText, newText, author, images] = tuple;
  const entry: AnnotationEntry = {
    kind: "insertion",
    id: `i-${index}`,
    contextText,
    newText,
  };
  if (author !== undefined && author.length > 0) entry.author = author;
  if (images !== undefined) entry.images = images;
  return entry;
};

const decodeReplacement = (tuple: ReplacementTuple, index: number): AnnotationEntry => {
  const [, originalText, replacementText, author, images] = tuple;
  const entry: AnnotationEntry = {
    kind: "replacement",
    id: `r-${index}`,
    originalText,
    replacementText,
  };
  if (author !== undefined && author.length > 0) entry.author = author;
  if (images !== undefined) entry.images = images;
  return entry;
};

const decodeTaskToggle = (tuple: TaskToggleTuple, index: number): AnnotationEntry => {
  const [, originalText, checkedFlag, author] = tuple;
  const entry: AnnotationEntry = {
    kind: "task",
    id: `t-${index}`,
    originalText,
    checked: checkedFlag === "1",
  };
  if (author !== undefined && author.length > 0) entry.author = author;
  return entry;
};

type DecoderTable = {
  [K in AnnotationTuple[0]]: (
    tuple: Extract<AnnotationTuple, readonly [K, ...unknown[]]>,
    index: number
  ) => AnnotationEntry;
};

const decoders: DecoderTable = {
  C: decodeComment,
  G: decodeGlobal,
  D: decodeDeletion,
  I: decodeInsertion,
  R: decodeReplacement,
  T: decodeTaskToggle,
};

/**
 * Decode a list of compact annotation tuples back into AnnotationEntry
 * objects. Ids are synthesized from the tuple position since the wire format
 * doesn't carry them. Callers that need to re-attach anchors should pair
 * this output with `dualAnchor.resolveAnchor` against the current Plate
 * value (Insertion anchors on `contextText`; Replacement on `originalText`).
 */
export const decodeAnnotations = (tuples: AnnotationTuple[]): AnnotationEntry[] =>
  tuples.map((tuple, i) =>
    (decoders[tuple[0]] as (t: AnnotationTuple, index: number) => AnnotationEntry)(tuple, i)
  );
