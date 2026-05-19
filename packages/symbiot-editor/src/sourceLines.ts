import { createPlatePlugin } from "platejs/react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { BlockLines, PlateNode, PlateValue } from "@symbiot/annotations";

interface MdastPosition {
  start: { line: number };
  end: { line: number };
}

interface MdastNode {
  position?: MdastPosition;
}

interface MdastRoot {
  children: MdastNode[];
}

interface BlockLineRange {
  startLine: number;
  endLine: number;
}

const blockLinesMark = "__symbiotBlockLines";

const collectMdastBlockLines = (markdown: string): BlockLineRange[] => {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown) as unknown as MdastRoot;
  const out: BlockLineRange[] = [];
  for (const child of tree.children) {
    if (child.position === undefined) continue;
    out.push({
      startLine: child.position.start.line,
      endLine: child.position.end.line,
    });
  }
  return out;
};

/**
 * Stamp `__symbiotBlockLines: { startLine, endLine }` on every top-level Plate
 * block whose position can be matched 1:1 with the source markdown's mdast
 * block tree. Mdast positions are 1-based, matching `BlockLines` exactly.
 *
 * Walks both sequences in document order; pairs by index. If counts diverge
 * (e.g. a remark plugin emits/absorbs a block), excess Plate blocks are left
 * un-stamped — `getBlockLines` returns `null` for those.
 */
export const stampBlockLines = (markdown: string, value: PlateValue): PlateValue => {
  const ranges = collectMdastBlockLines(markdown);
  const out: PlateValue = [];
  for (let i = 0; i < value.length; i += 1) {
    const node = value[i] as PlateNode;
    const range = ranges[i];
    if (range === undefined) {
      out.push(node);
      continue;
    }
    out.push({ ...node, [blockLinesMark]: range });
  }
  return out;
};

const isBlockLines = (raw: unknown): raw is BlockLines => {
  if (raw === null || typeof raw !== "object") return false;
  const c = raw as Partial<BlockLines>;
  return typeof c.startLine === "number" && typeof c.endLine === "number";
};

const readBlockLines = (node: PlateNode | undefined): BlockLines | null => {
  if (node === undefined) return null;
  const raw = (node as Record<string, unknown>)[blockLinesMark];
  return isBlockLines(raw) ? { startLine: raw.startLine, endLine: raw.endLine } : null;
};

/**
 * Look up the source-line range for the top-level block containing `path`.
 * Pure-function counterpart to the plugin API below — usable from `walkAnnotations`
 * without touching the editor.
 */
export const getBlockLinesForPath = (value: PlateValue, path: number[]): BlockLines | null => {
  if (path.length === 0) return null;
  const [blockIndex] = path;
  if (blockIndex === undefined) return null;
  return readBlockLines(value[blockIndex]);
};

/**
 * Plate plugin exposing `editor.api.getBlockLines(path)`. Reads the stamp
 * produced by `stampBlockLines` so callers can ask for line metadata without
 * re-parsing the source markdown.
 */
export const SourceLinesPlugin = createPlatePlugin({
  key: "source-lines",
}).extendEditorApi(({ editor }) => ({
  getBlockLines: (path: number[]): BlockLines | null => {
    const [blockIndex] = path;
    if (blockIndex === undefined) return null;
    const top = editor.children[blockIndex] as unknown as PlateNode | undefined;
    return readBlockLines(top);
  },
}));
