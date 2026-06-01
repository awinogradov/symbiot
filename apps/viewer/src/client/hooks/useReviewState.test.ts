// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { type ReviewEditorHandle } from "@symbiot/editor/components/ReviewEditor";
import { type AnnotationSidebarEntry } from "@symbiot/ui/components/AnnotationSidebarTypes";

import { useReviewState } from "./useReviewState.ts";

/** Minimal editor handle stub — only the members the update/prefill paths touch. */
const stubHandle = (overrides: Partial<ReviewEditorHandle> = {}): ReviewEditorHandle => ({
  hasValidSelection: () => false,
  triggerAnnotation: vi.fn(),
  getValue: () => [],
  getCommentBodies: () => new Map(),
  getCommentImages: () => new Map(),
  getCommentOriginalTexts: () => new Map(),
  getSuggestionOriginalTexts: () => new Map(),
  getInsertionNewTexts: () => new Map(),
  getInsertionImages: () => new Map(),
  getInsertionOriginalTexts: () => new Map(),
  getReplacementTexts: () => new Map(),
  getReplacementImages: () => new Map(),
  getReplacementOriginalTexts: () => new Map(),
  removeAnnotation: vi.fn(),
  updateAnnotation: vi.fn(),
  ...overrides,
});

const globalEntry = (id: string): AnnotationSidebarEntry => ({
  id,
  kind: "global",
  primary: "old body",
});

describe("useReviewState — onUpdateAnnotation", () => {
  it("updates a global comment in place, preserving its id", () => {
    const draft = { value: [], globalComments: [{ id: "g1", body: "old body" }] };
    const { result } = renderHook(() =>
      useReviewState({ draft: draft as never, saveDraft: vi.fn() })
    );
    act(() => result.current.setEditorHandle(stubHandle()));
    act(() => result.current.onUpdateAnnotation(globalEntry("g1"), "new body", []));
    expect(result.current.sidebarEntries).toContainEqual(
      expect.objectContaining({ id: "g1", kind: "global", primary: "new body" })
    );
  });

  it("routes anchored kinds to editorHandle.updateAnnotation and skips deletion", () => {
    const updateAnnotation = vi.fn();
    const { result } = renderHook(() => useReviewState({ draft: null, saveDraft: vi.fn() }));
    act(() => result.current.setEditorHandle(stubHandle({ updateAnnotation })));
    act(() =>
      result.current.onUpdateAnnotation(
        { id: "c1", kind: "comment", primary: "anchor", body: "b" },
        "edited",
        ["x.png"]
      )
    );
    expect(updateAnnotation).toHaveBeenCalledWith("comment", "c1", "edited", ["x.png"]);

    updateAnnotation.mockClear();
    act(() =>
      result.current.onUpdateAnnotation({ id: "d1", kind: "deletion", primary: "gone" }, "x", [])
    );
    expect(updateAnnotation).not.toHaveBeenCalled();
  });
});

describe("useReviewState — editContent", () => {
  it("reads global content from globalComments", () => {
    const draft = {
      value: [],
      globalComments: [{ id: "g1", body: "global body", images: ["g.png"] }],
    };
    const { result } = renderHook(() =>
      useReviewState({ draft: draft as never, saveDraft: vi.fn() })
    );
    expect(result.current.editContent(globalEntry("g1"))).toEqual({
      body: "global body",
      images: ["g.png"],
    });
  });

  it("reads anchored body + images from the editor handle, not the sidebar entry", () => {
    const handle = stubHandle({
      getReplacementTexts: () => new Map([["r1", "handle body"]]),
      getReplacementImages: () => new Map([["r1", ["h.png"]]]),
    });
    const { result } = renderHook(() => useReviewState({ draft: null, saveDraft: vi.fn() }));
    act(() => result.current.setEditorHandle(handle));
    const content = result.current.editContent({
      id: "r1",
      kind: "replacement",
      primary: "anchor",
      body: "stale entry body",
    });
    expect(content).toEqual({ body: "handle body", images: ["h.png"] });
  });
});
