/**
 * Annotation kinds + mark-prefix mapping shared by every author / remove flow.
 *
 * Deletion authoring writes the legacy `suggestion`/`suggestion_<id>` mark
 * pair (Phase 3.2 wire-format compatibility with the walker + `DeletionLeaf`).
 * Comment / Insertion / Replacement use marks that match their kind name.
 */

/** Annotation kinds that can be authored from the selection toolbar. */
export type AnnotationKind = "comment" | "deletion" | "insertion" | "replacement";

/** Mark prefix written to the editor for each annotation kind. */
export type AnnotationMarkPrefix = "comment" | "suggestion" | "insertion" | "replacement";

/**
 * Return the editor mark prefix to write for an annotation kind. `"deletion"`
 * collapses to `"suggestion"` so authored deletions and walker lookups stay
 * wire-format-compatible with phase 3.2.
 */
export const prefixOf = (kind: AnnotationKind): AnnotationMarkPrefix => {
  if (kind === "comment") return "comment";
  if (kind === "insertion") return "insertion";
  if (kind === "replacement") return "replacement";
  return "suggestion";
};
