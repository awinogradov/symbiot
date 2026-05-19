import { describe, expect, it } from "vitest";

import type { PlateValue } from "./types.ts";
import { onlyComments, onlyDeletions, onlyGlobals, walkAnnotations } from "./walkAnnotations.ts";

describe("walkAnnotations", () => {
  it("extracts comments, deletions, and global comments in one pass", () => {
    const value: PlateValue = [
      {
        type: "p",
        children: [
          { text: "keep " },
          { text: "this", comment: true, comment_c1: true },
          { text: " and " },
          { text: "drop", suggestion: true, suggestion_d1: true },
          { text: " this" },
        ],
      },
    ];
    const entries = walkAnnotations({
      value,
      commentBodies: new Map([["c1", "rename it"]]),
      globalComments: [{ id: "g1", body: "good direction" }],
    });

    expect(onlyComments(entries)).toEqual([{ id: "c1", originalText: "this", body: "rename it" }]);
    expect(onlyDeletions(entries)).toEqual([{ id: "d1", originalText: "drop" }]);
    expect(onlyGlobals(entries)).toEqual([{ id: "g1", body: "good direction" }]);
  });

  it("ignores comments without a body but always emits deletions", () => {
    const value: PlateValue = [
      {
        type: "p",
        children: [
          { text: "a", comment: true, comment_x: true },
          { text: "b", suggestion: true, suggestion_y: true },
        ],
      },
    ];
    const entries = walkAnnotations({
      value,
      commentBodies: new Map(),
      globalComments: [],
    });
    expect(onlyComments(entries)).toEqual([]);
    expect(onlyDeletions(entries)).toEqual([{ id: "y", originalText: "b" }]);
  });
});
