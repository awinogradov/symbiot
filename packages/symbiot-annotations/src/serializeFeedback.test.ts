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

  it("emits the canonical Comment format", () => {
    const entries: CommentEntry[] = [
      { id: "abc", originalText: "the quick brown fox", body: "Should this be a wolf?" },
    ];
    const out = serializeFeedback(entries);
    expect(out).toContain("# Plan Feedback");
    expect(out).toContain('## 1. Feedback on: "the quick brown fox"');
    expect(out).toContain("> Should this be a wolf?");
  });

  it("matches the captured comment golden fixture byte-for-byte", async () => {
    const expected = await loadFixture("golden/comment.md");
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
    const expected = await loadFixture("golden/deletion.md");
    const entries: AnnotationEntry[] = [
      { kind: "deletion", id: "1", originalText: "redundant clause" },
    ];
    expect(serializeFeedback(entries)).toBe(expected);
  });

  it("matches the synthesized global-comment fixture (byte-equality)", async () => {
    const expected = await loadFixture("golden/global-comment.md");
    const entries: AnnotationEntry[] = [
      { kind: "global", id: "1", body: "overall this looks great" },
    ];
    expect(serializeFeedback(entries)).toBe(expected);
  });

  it("matches the synthesized mixed fixture (C+D+G byte-equality)", async () => {
    const expected = await loadFixture("golden/mixed.md");
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

  it("matches the synthesized insertion fixture (byte-equality)", async () => {
    const expected = await loadFixture("golden/insertion.md");
    const entries: AnnotationEntry[] = [
      {
        kind: "insertion",
        id: "i1",
        contextText: "the quick brown fox",
        newText: "jumps",
      },
    ];
    expect(serializeFeedback(entries)).toBe(expected);
  });

  it("matches the synthesized replacement fixture (byte-equality)", async () => {
    const expected = await loadFixture("golden/replacement.md");
    const entries: AnnotationEntry[] = [
      {
        kind: "replacement",
        id: "r1",
        originalText: "redundant clause",
        replacementText: "concise note",
      },
    ];
    expect(serializeFeedback(entries)).toBe(expected);
  });

  it("matches the synthesized task fixture (byte-equality)", async () => {
    const expected = await loadFixture("golden/task.md");
    const entries: AnnotationEntry[] = [
      { kind: "task", id: "t1", originalText: "Open task", checked: true },
      { kind: "task", id: "t2", originalText: "Completed task", checked: false },
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

  it("emits a markdown image line for a single attached image on a comment", () => {
    const entries: AnnotationEntry[] = [
      {
        kind: "comment",
        id: "c1",
        originalText: "the quick brown fox",
        body: "Should this be a wolf?",
        images: ["abc.png"],
      },
    ];
    const out = serializeFeedback(entries);
    expect(out).toContain("> Should this be a wolf?");
    expect(out).toContain("> ![](abc.png)");
  });

  it("emits one markdown image line per attached image, in order", () => {
    const entries: AnnotationEntry[] = [
      {
        kind: "comment",
        id: "c1",
        originalText: "x",
        body: "y",
        images: ["first.png", "second.jpg", "third.webp"],
      },
    ];
    const out = serializeFeedback(entries);
    const firstIdx = out.indexOf("> ![](first.png)");
    const secondIdx = out.indexOf("> ![](second.jpg)");
    const thirdIdx = out.indexOf("> ![](third.webp)");
    expect(firstIdx).toBeGreaterThan(-1);
    expect(secondIdx).toBeGreaterThan(firstIdx);
    expect(thirdIdx).toBeGreaterThan(secondIdx);
  });

  it("emits image lines for deletion, global, insertion, and replacement entries", () => {
    const entries: AnnotationEntry[] = [
      { kind: "deletion", id: "d1", originalText: "redundant clause", images: ["d.png"] },
      { kind: "global", id: "g1", body: "overall this looks great", images: ["g.png"] },
      {
        kind: "insertion",
        id: "i1",
        contextText: "the quick brown fox",
        newText: "jumps",
        images: ["i.png"],
      },
      {
        kind: "replacement",
        id: "r1",
        originalText: "redundant clause",
        replacementText: "concise note",
        images: ["r.png"],
      },
    ];
    const out = serializeFeedback(entries);
    expect(out).toContain("> ![](d.png)");
    expect(out).toContain("> ![](g.png)");
    expect(out).toContain("> ![](i.png)");
    expect(out).toContain("> ![](r.png)");
  });

  it("emits no image lines when images is undefined or empty (parity with no-images fixture)", async () => {
    const expected = await loadFixture("golden/comment.md");
    const entriesUndef: AnnotationEntry[] = [
      {
        kind: "comment",
        id: "fixture-comment",
        originalText: "the quick brown fox",
        body: "Should this be a wolf?",
      },
    ];
    const entriesEmpty: AnnotationEntry[] = [
      {
        kind: "comment",
        id: "fixture-comment",
        originalText: "the quick brown fox",
        body: "Should this be a wolf?",
        images: [],
      },
    ];
    expect(serializeFeedback(entriesUndef)).toBe(expected);
    expect(serializeFeedback(entriesEmpty)).toBe(expected);
  });

  it("emits (lines N–M) prefix for insertion and replacement", () => {
    const entries: AnnotationEntry[] = [
      {
        kind: "insertion",
        id: "1",
        contextText: "ctx",
        newText: "n",
        lines: { startLine: 3, endLine: 4 },
      },
      {
        kind: "replacement",
        id: "2",
        originalText: "o",
        replacementText: "r",
        lines: { startLine: 7, endLine: 9 },
      },
    ];
    const out = serializeFeedback(entries);
    expect(out).toContain('## 1. (lines 3–4) Insert after: "ctx"');
    expect(out).toContain('## 2. (lines 7–9) Suggest replacing: "o"');
    expect(out).toContain('> Replace with: "r"');
  });
});

const loadFixture = async (relativePath: string): Promise<string> => {
  try {
    return await readFile(resolve(fixturesRoot, relativePath), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `Missing fixture ${relativePath} under fixtures/. Run the serializer and copy the actual output into the fixture to update it intentionally.`,
        { cause: error }
      );
    }
    throw error;
  }
};
