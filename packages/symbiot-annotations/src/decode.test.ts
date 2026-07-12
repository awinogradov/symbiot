import { describe, expect, it } from "vitest";

import { decodeAnnotations } from "./decode.ts";
import type {
  AnnotationTuple,
  CommentTuple,
  DeletionTuple,
  GlobalCommentTuple,
  InsertionTuple,
  ReplacementTuple,
} from "./types.ts";

describe("decodeAnnotations", () => {
  it("decodes a comment without optional author or images", () => {
    const tuples: CommentTuple[] = [["C", "anchored", "body"]];
    expect(decodeAnnotations(tuples)).toEqual([
      { kind: "comment", id: "c-0", originalText: "anchored", body: "body" },
    ]);
  });

  it("attaches author only when non-empty (empty string stripped)", () => {
    const tuples: CommentTuple[] = [
      ["C", "a", "b", "", ["img.png"]],
      ["C", "a", "b", "alice"],
    ];
    const out = decodeAnnotations(tuples);
    expect(out[0]).not.toHaveProperty("author");
    expect(out[0]).toHaveProperty("images", ["img.png"]);
    expect(out[1]).toHaveProperty("author", "alice");
  });

  it("decodes a global comment with and without author/images", () => {
    const tuples: GlobalCommentTuple[] = [
      ["G", "body-1"],
      ["G", "body-2", "bob", ["img.png"]],
    ];
    const out = decodeAnnotations(tuples);
    expect(out[0]).toEqual({ kind: "global", id: "g-0", body: "body-1" });
    expect(out[1]).toMatchObject({
      kind: "global",
      id: "g-1",
      body: "body-2",
      author: "bob",
      images: ["img.png"],
    });
  });

  it("decodes a deletion with and without author/images", () => {
    const tuples: DeletionTuple[] = [
      ["D", "gone"],
      ["D", "gone", "carol", ["img.png"]],
    ];
    const out = decodeAnnotations(tuples);
    expect(out[0]).toEqual({ kind: "deletion", id: "d-0", originalText: "gone" });
    expect(out[1]).toMatchObject({
      kind: "deletion",
      id: "d-1",
      originalText: "gone",
      author: "carol",
      images: ["img.png"],
    });
  });

  it("decodes an insertion with all optional fields", () => {
    const tuples: InsertionTuple[] = [
      ["I", "after this", "added text"],
      ["I", "after this", "added text", "dan", ["img.png"]],
    ];
    const out = decodeAnnotations(tuples);
    expect(out[0]).toEqual({
      kind: "insertion",
      id: "i-0",
      contextText: "after this",
      newText: "added text",
    });
    expect(out[1]).toMatchObject({
      kind: "insertion",
      id: "i-1",
      author: "dan",
      images: ["img.png"],
    });
  });

  it("decodes a replacement with all optional fields", () => {
    const tuples: ReplacementTuple[] = [
      ["R", "old", "new"],
      ["R", "old", "new", "eve", ["img.png"]],
    ];
    const out = decodeAnnotations(tuples);
    expect(out[0]).toEqual({
      kind: "replacement",
      id: "r-0",
      originalText: "old",
      replacementText: "new",
    });
    expect(out[1]).toMatchObject({
      kind: "replacement",
      id: "r-1",
      author: "eve",
      images: ["img.png"],
    });
  });

  it("synthesizes ids from tuple position across mixed kinds", () => {
    const out = decodeAnnotations([
      ["C", "a", "x"],
      ["G", "g"],
      ["D", "d"],
      ["I", "ctx", "ins"],
      ["R", "old", "new"],
    ]);
    expect(out.map((e) => e.id)).toEqual(["c-0", "g-1", "d-2", "i-3", "r-4"]);
  });

  // A share link from a build that knows a kind this one does not must still
  // open. The unknown tuple sits FIRST on purpose: ids are derived from tuple
  // position, so an implementation that filtered before mapping would renumber
  // the comment to `c-0` and still pass with the unknown tuple placed last.
  it("skips tuple kinds it does not recognize without shifting the ids of the rest", () => {
    const out = decodeAnnotations([
      ["Z", "from the future"],
      ["C", "a", "x"],
    ] as unknown as AnnotationTuple[]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: "comment", id: "c-1", originalText: "a", body: "x" });
  });
});
