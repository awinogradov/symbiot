import type {
  AnnotationEntry,
  BlockLines,
  CommentEntry,
  DeletionEntry,
  GlobalCommentEntry,
} from "./types.ts";

/**
 * Serialize annotations into plannotator-compatible feedback markdown.
 *
 * Matches `exportAnnotations()` in plannotator's `packages/ui/utils/parser.ts`:
 * each entry is numbered, gets an optional `(lines N–M)` prefix when block
 * source lines are available, and uses a per-kind heading + body.
 *
 * Phase 2 shipped Comment-only with no line labels (`fixtures/plannotator-reference/comment.md`).
 * Phase 3.1 extends to G and D and emits `(lines N–M)` when present.
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

const formatEntry = (entry: AnnotationEntry, index: number): string[] => {
  switch (entry.kind) {
    case "comment":
      return formatComment(entry, index);
    case "deletion":
      return formatDeletion(entry, index);
    case "global":
      return formatGlobal(entry, index);
  }
};

const formatComment = (entry: CommentEntry & { kind: "comment" }, index: number): string[] => [
  `## ${index}. ${linePrefix(entry.lines)}Feedback on: "${entry.originalText}"`,
  `> ${entry.body}`,
  "",
];

const formatDeletion = (entry: DeletionEntry & { kind: "deletion" }, index: number): string[] => [
  `## ${index}. ${linePrefix(entry.lines)}Suggest deleting: "${entry.originalText}"`,
  "",
];

const formatGlobal = (entry: GlobalCommentEntry & { kind: "global" }, index: number): string[] => [
  `## ${index}. General feedback`,
  `> ${entry.body}`,
  "",
];
