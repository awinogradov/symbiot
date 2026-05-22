import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { MarkdownPlugin } from "@platejs/markdown";
import { createPlateEditor } from "platejs/react";
import { describe, expect, it } from "vitest";
import type { PlateValue } from "@symbiot/annotations";

import { SymbiotDiffKit } from "./kit.ts";
import { computeDiffValue, pickChangedBlocks } from "./diffPlugin.ts";

const fixturesRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
  "fixtures",
  "diff-reference"
);

const loadFixture = async (name: string): Promise<{ previous: string; current: string }> => {
  const previous = await readFile(join(fixturesRoot, name, "previous.md"), "utf8");
  const current = await readFile(join(fixturesRoot, name, "current.md"), "utf8");
  return { previous, current };
};

interface DiffOp {
  type: "insert" | "delete" | "update";
}

const collectOps = (value: PlateValue): DiffOp[] => {
  const out: DiffOp[] = [];
  const visit = (node: unknown): void => {
    if (node === null || typeof node !== "object") return;
    const { diffOperation, children } = node as {
      diffOperation?: DiffOp;
      children?: unknown;
    };
    if (diffOperation !== undefined) out.push(diffOperation);
    if (Array.isArray(children)) {
      for (const child of children) visit(child);
    }
  };
  for (const block of value) visit(block);
  return out;
};

const buildDiff = (previous: string, current: string): PlateValue => {
  const editor = createPlateEditor({ plugins: SymbiotDiffKit });
  const md = editor.getApi(MarkdownPlugin).markdown;
  const prevValue = md.deserialize(previous) as PlateValue;
  const currValue = md.deserialize(current) as PlateValue;
  return computeDiffValue(prevValue, currValue, editor);
};

describe("computeDiffValue", () => {
  it("emits insert and delete ops for a single-word substitution", async () => {
    const { previous, current } = await loadFixture("small");
    const ops = collectOps(buildDiff(previous, current));
    expect(ops.length).toBeGreaterThan(0);
    expect(ops.some((op) => op.type === "insert")).toBe(true);
    expect(ops.some((op) => op.type === "delete")).toBe(true);
  });

  it("flags the inserted paragraph as an insert when a block is added", async () => {
    const { previous, current } = await loadFixture("block-insertion");
    const ops = collectOps(buildDiff(previous, current));
    expect(ops.some((op) => op.type === "insert")).toBe(true);
  });
});

describe("pickChangedBlocks", () => {
  it("keeps changed blocks and drops untouched ones", async () => {
    const { previous, current } = await loadFixture("block-insertion");
    const full = buildDiff(previous, current);
    const clean = pickChangedBlocks(full);
    expect(clean.length).toBeGreaterThan(0);
    expect(clean.length).toBeLessThan(full.length);
  });

  it("returns an empty array when previous and current are identical", () => {
    const md = "# Same plan\n\nNothing changed here.\n";
    const editor = createPlateEditor({ plugins: SymbiotDiffKit });
    const value = editor.getApi(MarkdownPlugin).markdown.deserialize(md) as PlateValue;
    const full = computeDiffValue(value, value, editor);
    expect(pickChangedBlocks(full)).toEqual([]);
  });
});
