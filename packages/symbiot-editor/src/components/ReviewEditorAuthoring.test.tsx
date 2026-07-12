// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { createSlateEditor } from "platejs";
import { describe, expect, it, vi } from "vitest";

import { SymbiotEditorKit } from "../utils/kit.ts";
import { decoratePendingHighlight, setPendingHighlight } from "../utils/pendingHighlight.ts";

import { emptyMaps, stubEditor, stubSetters } from "./_reviewEditorTestHelpers.ts";
import { type AnnotationMaps } from "./ReviewEditorState.tsx";
import {
  dispatchComposerSave,
  saveCommentBody,
  saveInsertionBody,
  saveReplacementBody,
  updateAnnotationMaps,
  useComposerController,
  useReadyHandle,
  useToolbarHandlers,
  type PendingAuthoring,
} from "./ReviewEditorAuthoring.tsx";

const applyAnnotationMock = vi.fn();
const capturePendingAnnotationMock = vi.fn();
const hasValidSelectionMock = vi.fn();

// Keep materializeAnnotation real so composer-controller tests observe live
// children mutations; the toolbar-facing entry points stay mocked.
vi.mock("../utils/applyAnnotation.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../utils/applyAnnotation.ts")>()),
  applyAnnotation: (...args: unknown[]) => applyAnnotationMock(...args),
  capturePendingAnnotation: (...args: unknown[]) => capturePendingAnnotationMock(...args),
  hasValidSelection: (...args: unknown[]) => hasValidSelectionMock(...args),
}));

const sampleRange = {
  anchor: { path: [0, 0], offset: 0 },
  focus: { path: [0, 0], offset: 5 },
};

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
      const pending: PendingAuthoring = {
        kind,
        applied: { id: "x", anchorText: "a", range: sampleRange },
      };
      dispatchComposerSave(pending, { body: "b", images: [] }, setters);
      expect(setters[bodySetter]).toHaveBeenCalledTimes(1);
      const otherBodySetters = saverCases.filter((c) => c.kind !== kind).map((c) => c.bodySetter);
      for (const k of otherBodySetters) expect(setters[k]).not.toHaveBeenCalled();
    }
  );
});

describe("useToolbarHandlers", () => {
  it("comment/insert/replace clicks capture the pending annotation and set the authoring slot", () => {
    const setters = stubSetters();
    const setPending = vi.fn();
    const editor = stubEditor();
    capturePendingAnnotationMock.mockReturnValue({
      id: "a1",
      anchorText: "anchor",
      range: sampleRange,
    });
    const { result } = renderHook(() =>
      useToolbarHandlers({ editor, maps: emptyMaps(), setters, setPending })
    );
    act(() => {
      result.current.onCommentClick();
    });
    expect(capturePendingAnnotationMock).toHaveBeenCalledWith(editor, "comment");
    expect(setPending).toHaveBeenCalledWith({
      kind: "comment",
      applied: { id: "a1", anchorText: "anchor", range: sampleRange },
    });

    setPending.mockClear();
    act(() => {
      result.current.onInsertClick();
    });
    expect(setPending).toHaveBeenCalledWith({
      kind: "insertion",
      applied: { id: "a1", anchorText: "anchor", range: sampleRange },
    });

    setPending.mockClear();
    act(() => {
      result.current.onReplaceClick();
    });
    expect(setPending).toHaveBeenCalledWith({
      kind: "replacement",
      applied: { id: "a1", anchorText: "anchor", range: sampleRange },
    });
  });

  it("comment/insert/replace handlers are no-ops when capture returns null (no valid selection)", () => {
    const setters = stubSetters();
    const setPending = vi.fn();
    capturePendingAnnotationMock.mockReturnValue(null);
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
    capturePendingAnnotationMock.mockReturnValue({ id: "x", anchorText: "y", range: sampleRange });
    applyAnnotationMock.mockReturnValue({ id: "d", anchorText: "y" });
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

describe("useComposerController", () => {
  // A real Slate editor (not the stub) so materializeAnnotation's split
  // transform and the pending-decoration store operate on live children.
  const seededEditor = (): ReturnType<typeof createSlateEditor> =>
    createSlateEditor({
      plugins: SymbiotEditorKit,
      value: [
        { type: "p", children: [{ text: "alpha" }] },
        { type: "p", children: [{ text: "bravo" }] },
      ],
    });

  const rangeAt = (block: number): typeof sampleRange => ({
    anchor: { path: [block, 0], offset: 0 },
    focus: { path: [block, 0], offset: 5 },
  });

  const pending = (id: string, block = 0): PendingAuthoring => ({
    kind: "comment",
    applied: { id, anchorText: id, range: rangeAt(block) },
  });

  /** Open the composer the way the toolbar does: decoration store + pending state. */
  const openPending = (
    editor: ReturnType<typeof createSlateEditor>,
    controller: { setPending: (p: PendingAuthoring) => void },
    id: string,
    block = 0
  ): void => {
    setPendingHighlight(editor, { kind: "comment", id, range: rangeAt(block) });
    controller.setPending(pending(id, block));
  };

  const decorations = (
    editor: ReturnType<typeof createSlateEditor>,
    block: number
  ): ReturnType<typeof decoratePendingHighlight> => {
    const path = [block, 0];
    return decoratePendingHighlight(editor, [editor.api.node(path)![0], path]);
  };

  const marks = (editor: ReturnType<typeof createSlateEditor>, path: number[]): Set<string> => {
    let node: unknown = { children: editor.children };
    for (const index of path) node = (node as { children: unknown[] }).children[index];
    return new Set(Object.keys(node as Record<string, unknown>));
  };

  it("cancel clears the pending decoration and never touches the model", () => {
    const editor = seededEditor();
    const setters = stubSetters();
    const { result } = renderHook(() => useComposerController(editor, setters));
    act(() => {
      openPending(editor, result.current, "a");
    });
    expect(decorations(editor, 0)).toHaveLength(1);
    const before = structuredClone(editor.children);

    act(() => {
      result.current.onComposerCancel();
    });
    // The eager highlight was only ever a decoration (symbiot#236): clearing it is a pure
    // view-state change, so the children are byte-identical and nothing needs reconciling.
    expect(decorations(editor, 0)).toBeUndefined();
    expect(editor.children).toEqual(before);
    expect(marks(editor, [0, 0]).has("comment_a")).toBe(false);
  });

  it("save materializes the stored mark, clears the decoration, and writes the body", () => {
    const editor = seededEditor();
    const setters = stubSetters();
    const { result } = renderHook(() => useComposerController(editor, setters));
    act(() => {
      openPending(editor, result.current, "a");
    });
    act(() => {
      result.current.onComposerSave({ body: "note", images: [] });
    });
    expect(marks(editor, [0, 0]).has("comment_a")).toBe(true);
    expect(marks(editor, [0, 0]).has("comment")).toBe(true);
    expect(decorations(editor, 0)).toBeUndefined();
    expect(setters.setBodies).toHaveBeenCalledTimes(1);
    // The body is persisted under the open annotation's id — run the state updater
    // to confirm the payload is routed to "a" (not a mis-routed or empty write).
    const updater = vi.mocked(setters.setBodies).mock.calls[0]?.[0];
    if (typeof updater !== "function") throw new Error("expected a setBodies updater function");
    expect(updater(new Map())).toEqual(new Map([["a", "note"]]));
  });

  it("is a no-op when save fires with no composer open", () => {
    const editor = seededEditor();
    const setters = stubSetters();
    const { result } = renderHook(() => useComposerController(editor, setters));
    act(() => {
      result.current.onComposerSave({ body: "stray", images: [] });
    });
    expect(setters.setBodies).not.toHaveBeenCalled();
    expect(marks(editor, [0, 0]).has("comment")).toBe(false);
  });

  it("cancels the right id after a prior save (savedRef resets per cycle)", () => {
    const editor = seededEditor();
    const setters = stubSetters();
    const { result } = renderHook(() => useComposerController(editor, setters));
    // Cycle 1: open + save "a" — savedRef suppresses the cancel path for this cycle only.
    act(() => {
      openPending(editor, result.current, "a");
    });
    act(() => {
      result.current.onComposerSave({ body: "kept", images: [] });
    });
    // Cycle 2: open + cancel "b" — the cancel must clear again, for "b" only.
    act(() => {
      openPending(editor, result.current, "b", 1);
    });
    act(() => {
      result.current.onComposerCancel();
    });
    expect(marks(editor, [0, 0]).has("comment_a")).toBe(true); // saved highlight survives
    expect(marks(editor, [1, 0]).has("comment_b")).toBe(false); // cancelled one never landed
    expect(decorations(editor, 1)).toBeUndefined();
  });

  it("suppresses the cancel path when a save closed the composer (savedRef guard)", () => {
    const editor = seededEditor();
    const setters = stubSetters();
    const { result } = renderHook(() => useComposerController(editor, setters));
    act(() => {
      openPending(editor, result.current, "a");
    });
    act(() => {
      result.current.onComposerSave({ body: "kept", images: [] });
    });
    // A stray cancel right after a save (e.g. a controlled close surfacing through Radix
    // `onOpenChange`) must take the `savedRef` branch and NOT disturb the just-saved mark.
    act(() => {
      result.current.onComposerCancel();
    });
    expect(marks(editor, [0, 0]).has("comment_a")).toBe(true);
  });

  it("is a no-op when cancel fires with no composer open", () => {
    const editor = seededEditor();
    const setters = stubSetters();
    const { result } = renderHook(() => useComposerController(editor, setters));
    const before = structuredClone(editor.children);
    act(() => {
      result.current.onComposerCancel();
    });
    expect(editor.children).toEqual(before);
  });

  it("clears a stranded decoration when the controller unmounts mid-compose", () => {
    const editor = seededEditor();
    const setters = stubSetters();
    const { result, unmount } = renderHook(() => useComposerController(editor, setters));
    act(() => {
      openPending(editor, result.current, "a");
    });
    expect(decorations(editor, 0)).toHaveLength(1);
    unmount();
    // Abnormal teardown (no save, no cancel) must not strand a phantom highlight
    // on the persistent editor instance.
    expect(decorations(editor, 0)).toBeUndefined();
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
