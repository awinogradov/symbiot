import type { CommentEntry } from "./types.ts";

/**
 * Serialize Comment annotations into the plannotator-compatible feedback
 * markdown format (PRD §14 row 1 "Quoted under anchor text").
 *
 * Matches `exportAnnotations()` in plannotator's `packages/ui/utils/parser.ts`
 * for the COMMENT case. Source-line labels (`(lines N–M)`) are intentionally
 * skipped — they require a Block model that lands in Phase 3 alongside the
 * full annotation pipeline. Phase 2's golden file documents the line-label
 * gap explicitly.
 *
 * @see fixtures/plannotator-reference/README.md
 */
export const serializeFeedback = (entries: CommentEntry[], _originalPlan: string): string => {
  if (entries.length === 0) return "No changes detected.";
  const pieces = entries.length === 1 ? "1 piece" : `${entries.length} pieces`;
  const lines: string[] = [
    "# Plan Feedback",
    "",
    `I've reviewed this plan and have ${pieces} of feedback:`,
    "",
  ];
  entries.forEach((entry, index) => lines.push(...formatEntry(entry, index + 1)));
  lines.push("---", "");
  return lines.join("\n");
};

const formatEntry = (entry: CommentEntry, index: number): string[] => [
  `## ${index}. Feedback on: "${entry.originalText}"`,
  `> ${entry.body}`,
  "",
];
