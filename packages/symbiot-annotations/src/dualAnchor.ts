import type { PlateNode, PlateTextLeaf, PlateValue } from "./types.ts";

/** Path + originalText snapshot — resolves to a range under document drift. */
export interface DualAnchor {
  /** Plate path (block index, then descendant indices) at the anchor's start. */
  pathAnchor: number[];
  /** The text the anchor was attached to. Used for text-quote fallback. */
  originalText: string;
}

/** Result of resolving a DualAnchor against a current Plate value. */
export type AnchorResolution =
  | { strategy: "path"; pathAnchor: number[]; text: string }
  | { strategy: "text-quote"; pathAnchor: number[]; text: string }
  | { strategy: "missing" };

const isText = (node: PlateNode): node is PlateTextLeaf =>
  typeof (node as PlateTextLeaf).text === "string";

const nodeAt = (value: PlateValue, path: number[]): PlateNode | null => {
  let node: PlateNode | PlateValue = value;
  for (const idx of path) {
    if (Array.isArray(node)) {
      node = node[idx] as PlateNode;
    } else if ("children" in node) {
      node = (node.children as PlateNode[])[idx] as PlateNode;
    } else {
      return null;
    }
    if (node === undefined) return null;
  }
  return node as PlateNode;
};

const concatText = (node: PlateNode): string => {
  if (isText(node)) return node.text;
  return node.children.map(concatText).join("");
};

const findTextQuote = (value: PlateValue, needle: string): number[] | null => {
  for (let i = 0; i < value.length; i += 1) {
    if (concatText(value[i] as PlateNode).includes(needle)) return [i];
  }
  return null;
};

/**
 * Resolve a DualAnchor against the current Plate value. Try the stored path
 * first; if it no longer addresses a node containing the original text, fall
 * back to a text-quote scan over each block. Returns `missing` when neither
 * strategy succeeds (the anchor's original text has been edited away).
 */
export const resolveAnchor = (value: PlateValue, anchor: DualAnchor): AnchorResolution => {
  const direct = nodeAt(value, anchor.pathAnchor);
  if (direct !== null && concatText(direct).includes(anchor.originalText)) {
    return {
      strategy: "path",
      pathAnchor: anchor.pathAnchor,
      text: anchor.originalText,
    };
  }
  const fallback = findTextQuote(value, anchor.originalText);
  if (fallback !== null) {
    return { strategy: "text-quote", pathAnchor: fallback, text: anchor.originalText };
  }
  return { strategy: "missing" };
};
