import type {
  AnnotationEntry,
  BlockLines,
  CommentEntry,
  DeletionEntry,
  GlobalCommentEntry,
  InsertionEntry,
  ReplacementEntry,
} from "./types.ts";

/**
 * Serialize annotations into feedback markdown.
 *
 * C / G / D match `exportAnnotations()` in plannotator's
 * `packages/ui/utils/parser.ts`: each entry is numbered, gets an optional
 * `(lines N–M)` prefix when block source lines are available, and uses a
 * per-kind heading + body.
 *
 * Phase 2 shipped Comment-only with no line labels (`fixtures/plannotator-reference/comment.md`).
 * Phase 3.1 extends to G and D and emits `(lines N–M)` when present.
 *
 * Phase 5.1 adds Insertion and Replacement as **symbiot-only export forms**
 * (no plannotator parity). They follow the same heading + quoted-body shape
 * as Comment per PRD Appendix A: Insertion → `Insert after: "<ctx>"` /
 * `> <newText>`; Replacement → `Suggest replacing: "<orig>"` /
 * `> Replace with: "<replacementText>"`.
 *
 * @see fixtures/plannotator-reference/README.md
 */
export const serializeFeedback = (
  entries: ReadonlyArray<AnnotationEntry | CommentEntry>
): string => {
  const normalized = entries.map(coerceLegacy);
  if (normalized.length === 0) return "No changes detected.";
  const pieces = normalized.length === 1 ? "1 piece" : `${normalized.length} pieces`;
  const lines: string[] = [
    "# Plan Feedback",
    "",
    `I've reviewed this plan and have ${pieces} of feedback:`,
    "",
  ];
  normalized.forEach((entry, index) => lines.push(...formatEntry(entry, index + 1)));
  lines.push("---", "");
  return lines.join("\n");
};

const coerceLegacy = (entry: AnnotationEntry | CommentEntry): AnnotationEntry => {
  if ("kind" in entry) return entry;
  return { kind: "comment", ...entry };
};

const linePrefix = (lines: BlockLines | undefined): string => {
  if (lines === undefined) return "";
  return `(lines ${lines.startLine}–${lines.endLine}) `;
};

const formatImages = (images: string[] | undefined): string[] => {
  if (images === undefined || images.length === 0) return [];
  return images.map((ref) => `> ![](${ref})`);
};

const formatComment = (entry: CommentEntry & { kind: "comment" }, index: number): string[] => [
  `## ${index}. ${linePrefix(entry.lines)}Feedback on: "${entry.originalText}"`,
  `> ${entry.body}`,
  ...formatImages(entry.images),
  "",
];

const formatDeletion = (entry: DeletionEntry & { kind: "deletion" }, index: number): string[] => [
  `## ${index}. ${linePrefix(entry.lines)}Suggest deleting: "${entry.originalText}"`,
  ...formatImages(entry.images),
  "",
];

const formatGlobal = (entry: GlobalCommentEntry & { kind: "global" }, index: number): string[] => [
  `## ${index}. General feedback`,
  `> ${entry.body}`,
  ...formatImages(entry.images),
  "",
];

const formatInsertion = (
  entry: InsertionEntry & { kind: "insertion" },
  index: number
): string[] => [
  `## ${index}. ${linePrefix(entry.lines)}Insert after: "${entry.contextText}"`,
  `> ${entry.newText}`,
  ...formatImages(entry.images),
  "",
];

const formatReplacement = (
  entry: ReplacementEntry & { kind: "replacement" },
  index: number
): string[] => [
  `## ${index}. ${linePrefix(entry.lines)}Suggest replacing: "${entry.originalText}"`,
  `> Replace with: "${entry.replacementText}"`,
  ...formatImages(entry.images),
  "",
];

type FormatterTable = {
  [K in AnnotationEntry["kind"]]: (
    entry: Extract<AnnotationEntry, { kind: K }>,
    index: number
  ) => string[];
};

const formatters: FormatterTable = {
  comment: formatComment,
  deletion: formatDeletion,
  global: formatGlobal,
  insertion: formatInsertion,
  replacement: formatReplacement,
};

const formatEntry = (entry: AnnotationEntry, index: number): string[] =>
  (formatters[entry.kind] as (e: AnnotationEntry, i: number) => string[])(entry, index);
