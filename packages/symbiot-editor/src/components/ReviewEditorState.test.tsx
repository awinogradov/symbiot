// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useAnnotationState } from "./ReviewEditorState.tsx";

describe("useAnnotationState", () => {
  it("seeds every map empty when no initial state is provided", () => {
    const { result } = renderHook(() => useAnnotationState({}));
    expect(result.current.maps.bodies.size).toBe(0);
    expect(result.current.maps.replacementOriginalTexts.size).toBe(0);
  });

  it("clones initial maps so mutating the input never bleeds into hook state", () => {
    const initialBodies = new Map([["c1", "hello"]]);
    const { result } = renderHook(() =>
      useAnnotationState({ initialBodies, initialInsertionNewTexts: new Map([["i1", "new"]]) })
    );
    initialBodies.set("c2", "leak");
    expect(result.current.maps.bodies.has("c2")).toBe(false);
    expect(result.current.maps.insertionNewTexts.get("i1")).toBe("new");
  });

  it("setters update the corresponding map and `maps` identity changes only when underlying state changes", () => {
    const { result, rerender } = renderHook(() => useAnnotationState({}));
    const firstMaps = result.current.maps;
    rerender();
    expect(result.current.maps).toBe(firstMaps);

    act(() => {
      result.current.setters.setBodies((prev) => new Map(prev).set("c1", "body"));
    });
    expect(result.current.maps).not.toBe(firstMaps);
    expect(result.current.maps.bodies.get("c1")).toBe("body");
  });

  it("setters for replacement and insertion submaps both flow through to `maps`", () => {
    const { result } = renderHook(() => useAnnotationState({}));
    act(() => {
      result.current.setters.setReplacementTexts((prev) => new Map(prev).set("r1", "with"));
      result.current.setters.setInsertionImages((prev) => new Map(prev).set("i1", ["a.png"]));
    });
    expect(result.current.maps.replacementTexts.get("r1")).toBe("with");
    expect(result.current.maps.insertionImages.get("i1")).toEqual(["a.png"]);
  });
});
