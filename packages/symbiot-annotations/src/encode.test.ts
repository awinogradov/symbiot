import { describe, expect, it } from "vitest";

import { decodeAnnotations } from "./decode.ts";
import { encodeAnnotations } from "./encode.ts";
import type { AnnotationEntry } from "./types.ts";

describe("encodeAnnotations", () => {
  it("emits C/D/I/R/G tuples in walk order", () => {
    const entries: AnnotationEntry[] = [
      { kind: "comment", id: "1", originalText: "foo", body: "needs work" },
      { kind: "deletion", id: "2", originalText: "redundant sentence" },
      { kind: "insertion", id: "3", contextText: "the fox", newText: "jumps" },
      { kind: "replacement", id: "4", originalText: "old", replacementText: "new" },
      { kind: "global", id: "5", body: "overall: nice plan" },
    ];
    expect(encodeAnnotations(entries)).toEqual([
      ["C", "foo", "needs work"],
      ["D", "redundant sentence"],
      ["I", "the fox", "jumps"],
      ["R", "old", "new"],
      ["G", "overall: nice plan"],
    ]);
  });

  it("appends author when set", () => {
    const entries: AnnotationEntry[] = [
      { kind: "comment", id: "1", originalText: "foo", body: "x", author: "ana" },
      { kind: "global", id: "2", body: "y", author: "ana" },
      { kind: "deletion", id: "3", originalText: "z", author: "ana" },
      { kind: "insertion", id: "4", contextText: "ctx", newText: "n", author: "ana" },
      { kind: "replacement", id: "5", originalText: "o", replacementText: "r", author: "ana" },
    ];
    expect(encodeAnnotations(entries)).toEqual([
      ["C", "foo", "x", "ana"],
      ["G", "y", "ana"],
      ["D", "z", "ana"],
      ["I", "ctx", "n", "ana"],
      ["R", "o", "r", "ana"],
    ]);
  });

  it("appends images (with empty-string author placeholder) when images are set", () => {
    const entries: AnnotationEntry[] = [
      { kind: "comment", id: "1", originalText: "foo", body: "x", images: ["img-1"] },
      { kind: "insertion", id: "2", contextText: "c", newText: "n", images: ["img-2"] },
      { kind: "replacement", id: "3", originalText: "o", replacementText: "r", images: ["img-3"] },
    ];
    expect(encodeAnnotations(entries)).toEqual([
      ["C", "foo", "x", "", ["img-1"]],
      ["I", "c", "n", "", ["img-2"]],
      ["R", "o", "r", "", ["img-3"]],
    ]);
  });

  it("appends images on deletion and global tuples too", () => {
    const entries: AnnotationEntry[] = [
      { kind: "deletion", id: "1", originalText: "gone", images: ["img-1"] },
      { kind: "global", id: "2", body: "msg", images: ["img-2"] },
    ];
    expect(encodeAnnotations(entries)).toEqual([
      ["D", "gone", "", ["img-1"]],
      ["G", "msg", "", ["img-2"]],
    ]);
  });
});

describe("decodeAnnotations", () => {
  it("inverts encode round-trip (modulo synthesized ids)", () => {
    const tuples = encodeAnnotations([
      { kind: "comment", id: "x", originalText: "foo", body: "y" },
      { kind: "global", id: "x", body: "z" },
      { kind: "deletion", id: "x", originalText: "w" },
      { kind: "insertion", id: "x", contextText: "ctx", newText: "n" },
      { kind: "replacement", id: "x", originalText: "o", replacementText: "r" },
    ]);
    const back = decodeAnnotations(tuples);
    expect(back.map((e) => e.kind)).toEqual([
      "comment",
      "global",
      "deletion",
      "insertion",
      "replacement",
    ]);
    expect(back[0]).toMatchObject({ kind: "comment", originalText: "foo", body: "y" });
    expect(back[1]).toMatchObject({ kind: "global", body: "z" });
    expect(back[2]).toMatchObject({ kind: "deletion", originalText: "w" });
    expect(back[3]).toMatchObject({ kind: "insertion", contextText: "ctx", newText: "n" });
    expect(back[4]).toMatchObject({
      kind: "replacement",
      originalText: "o",
      replacementText: "r",
    });
  });

  it("preserves author and images on I and R round-trips", () => {
    const tuples = encodeAnnotations([
      {
        kind: "insertion",
        id: "x",
        contextText: "ctx",
        newText: "n",
        author: "ana",
        images: ["i-1"],
      },
      {
        kind: "replacement",
        id: "x",
        originalText: "o",
        replacementText: "r",
        author: "ana",
        images: ["i-2"],
      },
    ]);
    const back = decodeAnnotations(tuples);
    expect(back[0]).toMatchObject({
      kind: "insertion",
      contextText: "ctx",
      newText: "n",
      author: "ana",
      images: ["i-1"],
    });
    expect(back[1]).toMatchObject({
      kind: "replacement",
      originalText: "o",
      replacementText: "r",
      author: "ana",
      images: ["i-2"],
    });
  });
});
