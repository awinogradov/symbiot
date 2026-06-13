import type { AnnotationEntry, AnnotationTuple } from "./types.ts";
import {
  toCommentTuple,
  toDeletionTuple,
  toGlobalCommentTuple,
  toInsertionTuple,
  toReplacementTuple,
  toTaskToggleTuple,
} from "./types.ts";

type EncoderTable = {
  [K in AnnotationEntry["kind"]]: (entry: Extract<AnnotationEntry, { kind: K }>) => AnnotationTuple;
};

const encoders: EncoderTable = {
  comment: toCommentTuple,
  global: toGlobalCommentTuple,
  deletion: toDeletionTuple,
  insertion: toInsertionTuple,
  replacement: toReplacementTuple,
  task: toTaskToggleTuple,
};

const encodeOne = (entry: AnnotationEntry): AnnotationTuple =>
  (encoders[entry.kind] as (e: AnnotationEntry) => AnnotationTuple)(entry);

/**
 * Encode a list of walked annotations into their compact tuple forms. Order
 * is preserved so callers can rely on document-order semantics for anchored
 * entries and append-order for Global Comments.
 */
export const encodeAnnotations = (entries: AnnotationEntry[]): AnnotationTuple[] =>
  entries.map(encodeOne);
