import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { serializeFeedback } from "./serializeFeedback.ts";
import type { AnnotationEntry, CommentEntry } from "./types.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const fixturesRoot = resolve(repoRoot, "fixtures");

describe("serializeFeedback", () => {
  it("returns the no-changes sentinel when there are no comments", () => {
    expect(serializeFeedback([])).toBe("No changes detected.");
  });

  it("emits the plannotator Comment format", () => {
    const entries: CommentEntry[] = [
      { id: "abc", originalText: "the quick brown fox", body: "Should this be a wolf?" },
    ];
    const out = serializeFeedback(entries);
    expect(out).toContain("# Plan Feedback");
    expect(out).toContain('## 1. Feedback on: "the quick brown fox"');
    expect(out).toContain("> Should this be a wolf?");
  });

  it("matches the captured plannotator reference fixture (M2 byte-equality)", async () => {
    const expected = await loadFixture("plannotator-reference/comment.md");
    const entries: CommentEntry[] = [
      {
        id: "fixture-comment",
        originalText: "the quick brown fox",
        body: "Should this be a wolf?",
      },
    ];
    const actual = serializeFeedback(entries);
    expect(actual).toBe(expected);
  });

  it("matches the synthesized deletion fixture (byte-equality)", async () => {
    const expected = await loadFixture("plannotator-reference/deletion.md");
    const entries: AnnotationEntry[] = [
      { kind: "deletion", id: "1", originalText: "redundant clause" },
    ];
    expect(serializeFeedback(entries)).toBe(expected);
  });

  it("matches the synthesized global-comment fixture (byte-equality)", async () => {
    const expected = await loadFixture("plannotator-reference/global-comment.md");
    const entries: AnnotationEntry[] = [
      { kind: "global", id: "1", body: "overall this looks great" },
    ];
    expect(serializeFeedback(entries)).toBe(expected);
  });

  it("matches the synthesized mixed fixture (C+D+G byte-equality)", async () => {
    const expected = await loadFixture("plannotator-reference/mixed.md");
    const entries: AnnotationEntry[] = [
      {
        kind: "comment",
        id: "c1",
        originalText: "the quick brown fox",
        body: "Should this be a wolf?",
      },
      { kind: "deletion", id: "d1", originalText: "redundant clause" },
      { kind: "global", id: "g1", body: "overall this looks great" },
    ];
    expect(serializeFeedback(entries)).toBe(expected);
  });

  it("emits (lines N–M) prefix when block lines are present", () => {
    const entries: AnnotationEntry[] = [
      {
        kind: "comment",
        id: "1",
        originalText: "x",
        body: "y",
        lines: { startLine: 12, endLine: 14 },
      },
    ];
    const out = serializeFeedback(entries);
    expect(out).toContain('## 1. (lines 12–14) Feedback on: "x"');
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
