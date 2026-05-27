import type { DiffOperation } from "@platejs/diff";
import { describe, expect, it } from "vitest";

import { describeUpdate, diffClassFor, elementDiffOperation, semanticTag } from "./DiffLeaf.tsx";

describe("diffClassFor", () => {
  it.each([
    { type: "insert" as const, token: "text-anno-insert" },
    { type: "delete" as const, token: "text-anno-delete" },
    { type: "update" as const, token: "text-anno-replace" },
  ])("$type op returns a class string carrying $token", ({ type, token }) => {
    expect(diffClassFor(type)).toContain(token);
  });

  it("delete op also carries line-through (the visual diff convention)", () => {
    expect(diffClassFor("delete")).toContain("line-through");
  });
});

describe("semanticTag", () => {
  it.each([
    { type: "insert" as const, tag: "ins" },
    { type: "delete" as const, tag: "del" },
    { type: "update" as const, tag: "span" },
  ])("$type op renders as <$tag>", ({ type, tag }) => {
    expect(semanticTag(type)).toBe(tag);
  });
});

describe("describeUpdate", () => {
  it("returns undefined for non-update ops", () => {
    const insertOp = { type: "insert", path: [], properties: {} } as unknown as DiffOperation;
    expect(describeUpdate(insertOp)).toBeUndefined();
  });

  it("returns undefined when an update op has no changed properties", () => {
    const op = {
      type: "update",
      path: [],
      properties: {},
      newProperties: {},
    } as unknown as DiffOperation;
    expect(describeUpdate(op)).toBeUndefined();
  });

  it("joins the union of property names from properties + newProperties (dedup)", () => {
    const op = {
      type: "update",
      path: [],
      properties: { bold: true, italic: false },
      newProperties: { italic: true, color: "red" },
    } as unknown as DiffOperation;
    const description = describeUpdate(op);
    expect(description).toBeDefined();
    expect(description).toContain("changed");
    expect(description).toContain("bold");
    expect(description).toContain("italic");
    expect(description).toContain("color");
    expect(description?.match(/italic/g)).toHaveLength(1);
  });
});

describe("elementDiffOperation", () => {
  type Element = Parameters<typeof elementDiffOperation>[0];

  it("returns null when element.diff is not exactly true", () => {
    expect(elementDiffOperation({ type: "p", children: [] })).toBeNull();
    const withFalseFlag: Element = { type: "p", children: [], diff: false };
    expect(elementDiffOperation(withFalseFlag)).toBeNull();
    const withStringFlag: Element = { type: "p", children: [], diff: "yes" };
    expect(elementDiffOperation(withStringFlag)).toBeNull();
  });

  it("returns null when diff is true but diffOperation is missing", () => {
    const flagOnly: Element = { type: "p", children: [], diff: true };
    expect(elementDiffOperation(flagOnly)).toBeNull();
  });

  it("returns the diffOperation payload when both fields are set", () => {
    const op = { type: "insert", path: [0] } as unknown as DiffOperation;
    const element: Element = { type: "p", children: [], diff: true, diffOperation: op };
    expect(elementDiffOperation(element)).toBe(op);
  });
});
