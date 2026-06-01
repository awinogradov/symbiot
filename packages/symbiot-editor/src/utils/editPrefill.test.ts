import { describe, expect, it } from "vitest";

import { type ReviewEditorHandle } from "../components/ReviewEditorTypes.tsx";

import { buildGlobalComment, resolveEditContent } from "./editPrefill.ts";

/** Seeds for the anchored getters the prefill helpers read. */
interface HandleSeed {
  commentBodies?: Map<string, string>;
  commentImages?: Map<string, string[]>;
  insertionNewTexts?: Map<string, string>;
  insertionImages?: Map<string, string[]>;
  replacementTexts?: Map<string, string>;
  replacementImages?: Map<string, string[]>;
}

/** Editor handle stub whose anchored getters return the seeded maps. */
const stubHandle = (seed: HandleSeed = {}): ReviewEditorHandle => ({
  hasValidSelection: () => false,
  triggerAnnotation: () => {},
  getValue: () => [],
  getCommentBodies: () => seed.commentBodies ?? new Map(),
  getCommentImages: () => seed.commentImages ?? new Map(),
  getCommentOriginalTexts: () => new Map(),
  getSuggestionOriginalTexts: () => new Map(),
  getInsertionNewTexts: () => seed.insertionNewTexts ?? new Map(),
  getInsertionImages: () => seed.insertionImages ?? new Map(),
  getInsertionOriginalTexts: () => new Map(),
  getReplacementTexts: () => seed.replacementTexts ?? new Map(),
  getReplacementImages: () => seed.replacementImages ?? new Map(),
  getReplacementOriginalTexts: () => new Map(),
  removeAnnotation: () => {},
  updateAnnotation: () => {},
});

describe("buildGlobalComment", () => {
  it("omits images when the array is empty", () => {
    expect(buildGlobalComment("g1", "body", [])).toEqual({ id: "g1", body: "body" });
  });

  it("attaches images when present", () => {
    expect(buildGlobalComment("g1", "body", ["a.png"])).toEqual({
      id: "g1",
      body: "body",
      images: ["a.png"],
    });
  });
});

describe("resolveEditContent", () => {
  it("reads a global comment from host state", () => {
    const globals = [{ id: "g1", body: "global body", images: ["g.png"] }];
    expect(resolveEditContent("global", "g1", "ignored", globals, stubHandle())).toEqual({
      body: "global body",
      images: ["g.png"],
    });
  });

  it("falls back to empty content for an unknown global id", () => {
    expect(resolveEditContent("global", "missing", "ignored", [], stubHandle())).toEqual({
      body: "",
      images: [],
    });
  });

  it("reads anchored comment / insertion / replacement bodies + images from the handle", () => {
    const handle = stubHandle({
      commentBodies: new Map([["c1", "comment body"]]),
      commentImages: new Map([["c1", ["c.png"]]]),
      insertionNewTexts: new Map([["i1", "insert body"]]),
      replacementTexts: new Map([["r1", "replace body"]]),
    });
    expect(resolveEditContent("comment", "c1", "", [], handle)).toEqual({
      body: "comment body",
      images: ["c.png"],
    });
    // insertion with no image entry exercises the `?? []` fallback.
    expect(resolveEditContent("insertion", "i1", "", [], handle)).toEqual({
      body: "insert body",
      images: [],
    });
    expect(resolveEditContent("replacement", "r1", "", [], handle)).toEqual({
      body: "replace body",
      images: [],
    });
  });

  it("uses the fallback body for an anchored id missing from the maps (`?? ''`)", () => {
    expect(resolveEditContent("comment", "gone", "", [], stubHandle())).toEqual({
      body: "",
      images: [],
    });
  });

  it("falls back to the projected body for deletion (no body source)", () => {
    expect(resolveEditContent("deletion", "d1", "fallback", [], stubHandle())).toEqual({
      body: "fallback",
      images: [],
    });
  });

  it("falls back when the editor handle is not yet mounted", () => {
    expect(resolveEditContent("comment", "c1", "fallback", [], null)).toEqual({
      body: "fallback",
      images: [],
    });
  });
});
