import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { serializeFeedback } from "./serializeFeedback.ts";
import { walkComments } from "./walkComments.ts";
import type { CommentEntry, PlateValue } from "./types.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const fixturesRoot = resolve(repoRoot, "fixtures");

describe("serializeFeedback", () => {
  it("returns the no-changes sentinel when there are no comments", () => {
    expect(serializeFeedback([], "# Plan\n\nDo the thing.\n")).toBe("No changes detected.");
  });

  it("emits the plannotator Comment format", () => {
    const entries: CommentEntry[] = [
      { id: "abc", originalText: "the quick brown fox", body: "Should this be a wolf?" },
    ];
    const out = serializeFeedback(entries, "The quick brown fox jumps.");
    expect(out).toContain("# Plan Feedback");
    expect(out).toContain('## 1. Feedback on: "the quick brown fox"');
    expect(out).toContain("> Should this be a wolf?");
  });

  it("matches the captured plannotator reference fixture (M2 byte-equality)", async () => {
    const plan = await loadFixture("plans/elements.md");
    const expected = await loadFixture("plannotator-reference/comment.md");
    const entries: CommentEntry[] = [
      {
        id: "fixture-comment",
        originalText: "the quick brown fox",
        body: "Should this be a wolf?",
      },
    ];
    const actual = serializeFeedback(entries, plan);
    expect(actual).toBe(expected);
  });
});

describe("walkComments", () => {
  it("groups contiguous leaves sharing a comment id", () => {
    const value: PlateValue = [
      {
        type: "p",
        children: [
          { text: "Hello " },
          { text: "world", comment: true, comment_x: true },
          { text: "!" },
        ],
      },
    ];
    const bodies = new Map<string, string>([["x", "needs work"]]);
    expect(walkComments(value, bodies)).toEqual([
      { id: "x", originalText: "world", body: "needs work" },
    ]);
  });

  it("ignores comments without a body", () => {
    const value: PlateValue = [
      { type: "p", children: [{ text: "x", comment: true, comment_y: true }] },
    ];
    expect(walkComments(value, new Map())).toEqual([]);
  });
});

const loadFixture = async (relativePath: string): Promise<string> => {
  try {
    return await readFile(resolve(fixturesRoot, relativePath), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `Missing fixture ${relativePath}. Capture it per plans/02-mvp.md §7 before running this test.`,
        { cause: error }
      );
    }
    throw error;
  }
};
