// @vitest-environment happy-dom
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDraftBody, putDraftBody } = vi.hoisted(() => ({
  getDraftBody: vi.fn(),
  putDraftBody: vi.fn(async () => undefined),
}));

vi.mock("../libs/apiClient.ts", () => ({ getDraftBody, putDraftBody }));

const { useDraftBody } = await import("./useDraftBody.ts");

beforeEach(() => {
  getDraftBody.mockClear();
  putDraftBody.mockClear();
});

describe("useDraftBody hydration", () => {
  it("hydrates the autosaved markdown when its version matches the boot version", async () => {
    getDraftBody.mockResolvedValueOnce({ markdown: "# Typed", version: 3, updatedAt: 1 });
    const { result } = renderHook(() => useDraftBody(3));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.loaded).toBe("# Typed");
  });

  it("ignores a stale blob persisted against an older boot version", async () => {
    getDraftBody.mockResolvedValueOnce({ markdown: "# Stale", version: 2, updatedAt: 1 });
    const { result } = renderHook(() => useDraftBody(3));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.loaded).toBeNull();
  });

  it("treats an absent payload as no draft", async () => {
    getDraftBody.mockResolvedValueOnce(null);
    const { result } = renderHook(() => useDraftBody(3));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.loaded).toBeNull();
  });
});

describe("useDraftBody save", () => {
  it("debounces, serializes once at flush time, and stamps the boot version", async () => {
    vi.useFakeTimers();
    try {
      getDraftBody.mockResolvedValueOnce(null);
      const { result } = renderHook(() => useDraftBody(5));
      const getMarkdown = vi.fn(() => "# Flushed");
      result.current.save(getMarkdown);
      result.current.save(getMarkdown);
      expect(putDraftBody).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1_000);
      expect(getMarkdown).toHaveBeenCalledTimes(1);
      expect(putDraftBody).toHaveBeenCalledWith(
        expect.objectContaining({ markdown: "# Flushed", version: 5 })
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("cancel drops the pending save and disables future ones", () => {
    vi.useFakeTimers();
    try {
      getDraftBody.mockResolvedValueOnce(null);
      const { result } = renderHook(() => useDraftBody(5));
      result.current.save(() => "# Pending");
      result.current.cancel();
      vi.advanceTimersByTime(1_000);
      result.current.save(() => "# After cancel");
      vi.advanceTimersByTime(1_000);
      expect(putDraftBody).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
