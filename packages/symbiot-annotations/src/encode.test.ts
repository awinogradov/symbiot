import { describe, expect, it } from "vitest";

import { decodeAnnotations } from "./decode.ts";
import { encodeAnnotations } from "./encode.ts";
import type { AnnotationEntry } from "./types.ts";

describe("encodeAnnotations", () => {
  it("emits C tuples for comments, G for globals, D for deletions, in walk order", () => {
    const entries: AnnotationEntry[] = [
      { kind: "comment", id: "1", originalText: "foo", body: "needs work" },
      { kind: "deletion", id: "2", originalText: "redundant sentence" },
      { kind: "global", id: "3", body: "overall: nice plan" },
    ];
    expect(encodeAnnotations(entries)).toEqual([
      ["C", "foo", "needs work"],
      ["D", "redundant sentence"],
      ["G", "overall: nice plan"],
    ]);
  });

  it("appends author when set", () => {
    const entries: AnnotationEntry[] = [
      { kind: "comment", id: "1", originalText: "foo", body: "x", author: "ana" },
      { kind: "global", id: "2", body: "y", author: "ana" },
      { kind: "deletion", id: "3", originalText: "z", author: "ana" },
    ];
    expect(encodeAnnotations(entries)).toEqual([
      ["C", "foo", "x", "ana"],
      ["G", "y", "ana"],
      ["D", "z", "ana"],
    ]);
  });

  it("appends images (with empty-string author placeholder) when images are set", () => {
    const entries: AnnotationEntry[] = [
      { kind: "comment", id: "1", originalText: "foo", body: "x", images: ["img-1"] },
    ];
    expect(encodeAnnotations(entries)).toEqual([["C", "foo", "x", "", ["img-1"]]]);
  });
});

describe("decodeAnnotations", () => {
  it("inverts encode round-trip (modulo synthesized ids)", () => {
    const tuples = encodeAnnotations([
      { kind: "comment", id: "x", originalText: "foo", body: "y" },
      { kind: "global", id: "x", body: "z" },
      { kind: "deletion", id: "x", originalText: "w" },
    ]);
    const back = decodeAnnotations(tuples);
    expect(back.map((e) => e.kind)).toEqual(["comment", "global", "deletion"]);
    expect(back[0]).toMatchObject({ kind: "comment", originalText: "foo", body: "y" });
    expect(back[1]).toMatchObject({ kind: "global", body: "z" });
    expect(back[2]).toMatchObject({ kind: "deletion", originalText: "w" });
  });
});
