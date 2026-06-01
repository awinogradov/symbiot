// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { emptyMaps, stubEditor, stubSetters } from "./_reviewEditorTestHelpers.ts";
import { type AnnotationMaps } from "./ReviewEditorState.tsx";
import {
  dispatchComposerSave,
  saveCommentBody,
  saveInsertionBody,
  saveReplacementBody,
  updateAnnotationMaps,
  useReadyHandle,
  useToolbarHandlers,
  type PendingAuthoring,
} from "./ReviewEditorAuthoring.tsx";

const applyAnnotationMock = vi.fn();
const hasValidSelectionMock = vi.fn();

vi.mock("../utils/applyAnnotation.ts", () => ({
  applyAnnotation: (...args: unknown[]) => applyAnnotationMock(...args),
  hasValidSelection: (...args: unknown[]) => hasValidSelectionMock(...args),
}));

interface SaverCase {
  name: string;
  kind: PendingAuthoring["kind"];
  saver: typeof saveCommentBody;
  bodySetter: keyof ReturnType<typeof stubSetters>;
  imageSetter: keyof ReturnType<typeof stubSetters>;
  originalTextSetter: keyof ReturnType<typeof stubSetters>;
}

const saverCases: SaverCase[] = [
  {
    name: "saveCommentBody",
    kind: "comment",
    saver: saveCommentBody,
    bodySetter: "setBodies",
    imageSetter: "setImages",
    originalTextSetter: "setCommentOriginalTexts",
  },
  {
    name: "saveInsertionBody",
    kind: "insertion",
    saver: saveInsertionBody,
    bodySetter: "setInsertionNewTexts",
    imageSetter: "setInsertionImages",
    originalTextSetter: "setInsertionOriginalTexts",
  },
  {
    name: "saveReplacementBody",
    kind: "replacement",
    saver: saveReplacementBody,
    bodySetter: "setReplacementTexts",
    imageSetter: "setReplacementImages",
    originalTextSetter: "setReplacementOriginalTexts",
  },
];

describe("annotation savers (saveComment/Insertion/Replacement Body)", () => {
  it.each(saverCases)(
    "$name writes body + originalText and skips images when payload.images is empty",
    ({ saver, bodySetter, imageSetter, originalTextSetter }) => {
      const setters = stubSetters();
      saver(setters, "id", "anchor", { body: "x", images: [] });
      expect(setters[bodySetter]).toHaveBeenCalledTimes(1);
      expect(setters[originalTextSetter]).toHaveBeenCalledTimes(1);
      expect(setters[imageSetter]).not.toHaveBeenCalled();
    }
  );

  it.each(saverCases)(
    "$name writes the images setter when payload.images is non-empty",
    ({ saver, imageSetter }) => {
      const setters = stubSetters();
      saver(setters, "id", "anchor", { body: "x", images: ["a.png"] });
      expect(setters[imageSetter]).toHaveBeenCalledTimes(1);
    }
  );
});

describe("dispatchComposerSave", () => {
  it.each(saverCases)(
    "$kind routes to $name and does not touch unrelated kind setters",
    ({ kind, bodySetter }) => {
      const setters = stubSetters();
      const pending: PendingAuthoring = { kind, applied: { id: "x", anchorText: "a" } };
      dispatchComposerSave(pending, { body: "b", images: [] }, setters);
      expect(setters[bodySetter]).toHaveBeenCalledTimes(1);
      const otherBodySetters = saverCases.filter((c) => c.kind !== kind).map((c) => c.bodySetter);
      for (const k of otherBodySetters) expect(setters[k]).not.toHaveBeenCalled();
    }
  );
});

describe("useToolbarHandlers", () => {
  it("comment/insert/replace clicks call applyAnnotation and set the pending authoring slot", () => {
    const setters = stubSetters();
    const setPending = vi.fn();
    const editor = stubEditor();
    applyAnnotationMock.mockReturnValue({ id: "a1", anchorText: "anchor" });
    const { result } = renderHook(() =>
      useToolbarHandlers({ editor, maps: emptyMaps(), setters, setPending })
    );
    act(() => {
      result.current.onCommentClick();
    });
    expect(applyAnnotationMock).toHaveBeenCalledWith(editor, "comment");
    expect(setPending).toHaveBeenCalledWith({
      kind: "comment",
      applied: { id: "a1", anchorText: "anchor" },
    });

    setPending.mockClear();
    act(() => {
      result.current.onInsertClick();
    });
    expect(setPending).toHaveBeenCalledWith({
      kind: "insertion",
      applied: { id: "a1", anchorText: "anchor" },
    });

    setPending.mockClear();
    act(() => {
      result.current.onReplaceClick();
    });
    expect(setPending).toHaveBeenCalledWith({
      kind: "replacement",
      applied: { id: "a1", anchorText: "anchor" },
    });
  });

  it("comment/insert/replace handlers are no-ops when applyAnnotation returns null (no valid selection)", () => {
    const setters = stubSetters();
    const setPending = vi.fn();
    applyAnnotationMock.mockReturnValue(null);
    const { result } = renderHook(() =>
      useToolbarHandlers({
        editor: stubEditor(),
        maps: emptyMaps(),
        setters,
        setPending,
      })
    );
    act(() => {
      result.current.onCommentClick();
    });
    expect(setPending).not.toHaveBeenCalled();
  });

  it("delete click writes suggestionOriginalTexts when applyAnnotation succeeds", () => {
    const setters = stubSetters();
    applyAnnotationMock.mockReturnValue({ id: "d1", anchorText: "doomed" });
    const { result } = renderHook(() =>
      useToolbarHandlers({
        editor: stubEditor(),
        maps: emptyMaps(),
        setters,
        setPending: vi.fn(),
      })
    );
    act(() => {
      result.current.onDeleteClick();
    });
    expect(setters.setSuggestionOriginalTexts).toHaveBeenCalledTimes(1);
  });

  it("delete click calls onChange with the snapshot when applyAnnotation returns null", () => {
    const setters = stubSetters();
    const onChange = vi.fn();
    applyAnnotationMock.mockReturnValue(null);
    const editor = stubEditor();
    const { result } = renderHook(() =>
      useToolbarHandlers({
        editor,
        maps: emptyMaps(),
        setters,
        setPending: vi.fn(),
        onChange,
      })
    );
    act(() => {
      result.current.onDeleteClick();
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(setters.setSuggestionOriginalTexts).not.toHaveBeenCalled();
  });

  it("triggerAnnotation dispatches each kind to the matching click handler", () => {
    const setters = stubSetters();
    const setPending = vi.fn();
    applyAnnotationMock.mockReturnValue({ id: "x", anchorText: "y" });
    const { result } = renderHook(() =>
      useToolbarHandlers({
        editor: stubEditor(),
        maps: emptyMaps(),
        setters,
        setPending,
      })
    );
    act(() => {
      result.current.triggerAnnotation("comment");
      result.current.triggerAnnotation("insertion");
      result.current.triggerAnnotation("replacement");
      result.current.triggerAnnotation("deletion");
    });
    // Comment / insertion / replacement go through setPending; deletion goes to setters.
    expect(setPending).toHaveBeenCalledTimes(3);
    expect(setters.setSuggestionOriginalTexts).toHaveBeenCalledTimes(1);
  });
});

describe("useReadyHandle", () => {
  it("calls onReady once with a handle whose getters return clones of every supplied map", () => {
    const maps = emptyMaps();
    maps.bodies.set("c", "body");
    maps.images.set("c", ["img.png"]);
    maps.commentOriginalTexts.set("c", "orig-c");
    maps.suggestionOriginalTexts.set("d", "orig-d");
    maps.insertionNewTexts.set("i", "new");
    maps.insertionImages.set("i", ["i.png"]);
    maps.insertionOriginalTexts.set("i", "ctx");
    maps.replacementTexts.set("r", "with");
    maps.replacementImages.set("r", ["r.png"]);
    maps.replacementOriginalTexts.set("r", "old");
    const onReady = vi.fn();
    const removeAnnotation = vi.fn();
    const triggerAnnotation = vi.fn();
    hasValidSelectionMock.mockReturnValue(true);
    const editor = stubEditor({ children: [{ type: "p", children: [{ text: "t" }] }] });
    const updateAnnotation = vi.fn();
    renderHook(() =>
      useReadyHandle(editor, maps, removeAnnotation, updateAnnotation, triggerAnnotation, onReady)
    );
    expect(onReady).toHaveBeenCalledTimes(1);
    const firstCall = onReady.mock.calls.at(0);
    if (firstCall === undefined) throw new Error("onReady was not called");
    const [handle] = firstCall;
    expect(handle.hasValidSelection()).toBe(true);
    expect(handle.getValue()).toBe(editor.children);
    // Exercise every getter so the per-getter arrow function is covered.
    expect(handle.getCommentBodies()).not.toBe(maps.bodies);
    expect(handle.getCommentImages().get("c")).toEqual(["img.png"]);
    expect(handle.getCommentOriginalTexts().get("c")).toBe("orig-c");
    expect(handle.getSuggestionOriginalTexts().get("d")).toBe("orig-d");
    expect(handle.getInsertionNewTexts().get("i")).toBe("new");
    expect(handle.getInsertionImages().get("i")).toEqual(["i.png"]);
    expect(handle.getInsertionOriginalTexts().get("i")).toBe("ctx");
    expect(handle.getReplacementTexts().get("r")).toBe("with");
    expect(handle.getReplacementImages().get("r")).toEqual(["r.png"]);
    expect(handle.getReplacementOriginalTexts().get("r")).toBe("old");
    handle.triggerAnnotation("comment");
    expect(triggerAnnotation).toHaveBeenCalledWith("comment");
    handle.removeAnnotation("comment", "c");
    expect(removeAnnotation).toHaveBeenCalledWith("comment", "c");
    handle.updateAnnotation("comment", "c", "edited", []);
    expect(updateAnnotation).toHaveBeenCalledWith("comment", "c", "edited", []);
  });

  it("is a no-op when onReady is not provided", () => {
    expect(() =>
      renderHook(() =>
        useReadyHandle(stubEditor(), emptyMaps(), vi.fn(), vi.fn(), vi.fn(), undefined)
      )
    ).not.toThrow();
  });
});

interface UpdateCase {
  kind: "comment" | "insertion" | "replacement";
  seedBody: (maps: AnnotationMaps, id: string, value: string) => void;
  seedImage: (maps: AnnotationMaps, id: string, value: string[]) => void;
  seedOriginal: (maps: AnnotationMaps, id: string, value: string) => void;
  bodySetter: keyof ReturnType<typeof stubSetters>;
  imageSetter: keyof ReturnType<typeof stubSetters>;
  originalTextSetter: keyof ReturnType<typeof stubSetters>;
}

const updateCases: UpdateCase[] = [
  {
    kind: "comment",
    seedBody: (maps, id, value) => maps.bodies.set(id, value),
    seedImage: (maps, id, value) => maps.images.set(id, value),
    seedOriginal: (maps, id, value) => maps.commentOriginalTexts.set(id, value),
    bodySetter: "setBodies",
    imageSetter: "setImages",
    originalTextSetter: "setCommentOriginalTexts",
  },
  {
    kind: "insertion",
    seedBody: (maps, id, value) => maps.insertionNewTexts.set(id, value),
    seedImage: (maps, id, value) => maps.insertionImages.set(id, value),
    seedOriginal: (maps, id, value) => maps.insertionOriginalTexts.set(id, value),
    bodySetter: "setInsertionNewTexts",
    imageSetter: "setInsertionImages",
    originalTextSetter: "setInsertionOriginalTexts",
  },
  {
    kind: "replacement",
    seedBody: (maps, id, value) => maps.replacementTexts.set(id, value),
    seedImage: (maps, id, value) => maps.replacementImages.set(id, value),
    seedOriginal: (maps, id, value) => maps.replacementOriginalTexts.set(id, value),
    bodySetter: "setReplacementTexts",
    imageSetter: "setReplacementImages",
    originalTextSetter: "setReplacementOriginalTexts",
  },
];

describe("updateAnnotationMaps", () => {
  it.each(updateCases)(
    "$kind writes the new body + images but leaves the originalText drift baseline untouched",
    ({ kind, seedBody, seedOriginal, bodySetter, imageSetter, originalTextSetter }) => {
      const maps = emptyMaps();
      seedBody(maps, "id", "old");
      seedOriginal(maps, "id", "anchor-baseline");
      const setters = stubSetters();
      updateAnnotationMaps(kind, "id", "new body", ["new.png"], maps, setters);
      expect(setters[bodySetter]).toHaveBeenCalledWith(new Map([["id", "new body"]]));
      expect(setters[imageSetter]).toHaveBeenCalledWith(new Map([["id", ["new.png"]]]));
      // The anchor baseline that drives drift detection is NOT rewritten on a body edit.
      expect(setters[originalTextSetter]).not.toHaveBeenCalled();
    }
  );

  it.each(updateCases)(
    "$kind drops the image key when the edit clears all images",
    ({ kind, seedBody, seedImage, imageSetter }) => {
      const maps = emptyMaps();
      seedBody(maps, "id", "old");
      seedImage(maps, "id", ["was.png"]);
      const setters = stubSetters();
      updateAnnotationMaps(kind, "id", "new body", [], maps, setters);
      expect(setters[imageSetter]).toHaveBeenCalledWith(new Map());
    }
  );

  it.each(updateCases)(
    "$kind is a no-op when the id is unknown (orphan guard — never resurrects a removed entry)",
    ({ kind, bodySetter, imageSetter }) => {
      const setters = stubSetters();
      updateAnnotationMaps(kind, "missing", "body", ["x.png"], emptyMaps(), setters);
      expect(setters[bodySetter]).not.toHaveBeenCalled();
      expect(setters[imageSetter]).not.toHaveBeenCalled();
    }
  );
});
