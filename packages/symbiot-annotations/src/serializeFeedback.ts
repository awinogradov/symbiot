import type {
  AnnotationEntry,
  BlockLines,
  CommentEntry,
  DeletionEntry,
  GlobalCommentEntry,
  InsertionEntry,
  ReplacementEntry,
  TaskToggleEntry,
} from "./types.ts";

/**
 * Serialize annotations into feedback markdown.
 *
 * Each entry is numbered, gets an optional `(lines N–M)` prefix when block
 * source lines are available, and uses a per-kind heading + body:
 *
 * - Comment      → `Feedback on …` + quoted comment body.
 * - Global       → dedicated global-comments section, no anchor.
 * - Deletion     → `Suggest removing: "<originalText>"`.
 * - Insertion    → `Insert after: "<contextText>"` + `> <newText>`.
 * - Replacement  → `Suggest replacing: "<originalText>"` + `> Replace with: "<replacementText>"`.
 * - Task         → `Suggest marking as done|not done: "<originalText>"`.
 *
 * The output is byte-pinned against the fixtures under `fixtures/golden/`.
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

const formatTask = (entry: TaskToggleEntry & { kind: "task" }, index: number): string[] => [
  `## ${index}. ${linePrefix(entry.lines)}Suggest marking as ${
    entry.checked ? "done" : "not done"
  }: "${entry.originalText}"`,
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
  task: formatTask,
};

const formatEntry = (entry: AnnotationEntry, index: number): string[] =>
  (formatters[entry.kind] as (e: AnnotationEntry, i: number) => string[])(entry, index);
