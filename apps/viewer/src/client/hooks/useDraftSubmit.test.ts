// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { postDraftSend, postApprove, deleteDraft } = vi.hoisted(() => ({
  postDraftSend: vi.fn(async () => undefined),
  postApprove: vi.fn(async () => undefined),
  deleteDraft: vi.fn(async () => undefined),
}));

vi.mock("../libs/apiClient.ts", () => ({ postDraftSend, postApprove, deleteDraft }));

const { useDraftSubmit } = await import("./useDraftSubmit.ts");

const handle = { getMarkdown: () => "# Draft body\n" };

beforeEach(() => {
  postDraftSend.mockClear();
  postDraftSend.mockResolvedValue(undefined);
  postApprove.mockClear();
  deleteDraft.mockClear();
  vi.spyOn(window, "close")
    .mockImplementation(() => undefined)
    .mockClear();
});

describe("useDraftSubmit", () => {
  it("onSend serializes once, posts the draft, and lands on done/sent", async () => {
    const cancelDraft = vi.fn();
    const { result } = renderHook(() => useDraftSubmit({ editorHandle: handle, cancelDraft }));
    await act(() => result.current.onSend());
    expect(cancelDraft).toHaveBeenCalledOnce();
    expect(postDraftSend).toHaveBeenCalledWith("# Draft body\n");
    expect(deleteDraft).toHaveBeenCalledOnce();
    expect(result.current.phase).toBe("done");
    expect(result.current.outcome).toBe("sent");
  });

  it("onApprove posts the final markdown and lands on done/approved", async () => {
    const { result } = renderHook(() =>
      useDraftSubmit({ editorHandle: handle, cancelDraft: vi.fn() })
    );
    await act(() => result.current.onApprove());
    expect(postApprove).toHaveBeenCalledWith("# Draft body\n");
    expect(result.current.phase).toBe("done");
    expect(result.current.outcome).toBe("approved");
  });

  it("a failed decision POST resets phase to ready instead of stranding submitting", async () => {
    postDraftSend.mockRejectedValueOnce(new Error("500 write-failed"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { result } = renderHook(() =>
      useDraftSubmit({ editorHandle: handle, cancelDraft: vi.fn() })
    );
    await act(() => result.current.onSend());
    expect(result.current.phase).toBe("ready");
    expect(deleteDraft).not.toHaveBeenCalled();
    expect(window.close).not.toHaveBeenCalled();
  });

  it("is a no-op without an editor handle", async () => {
    const { result } = renderHook(() =>
      useDraftSubmit({ editorHandle: null, cancelDraft: vi.fn() })
    );
    await act(() => result.current.onSend());
    expect(postDraftSend).not.toHaveBeenCalled();
    expect(result.current.phase).toBe("ready");
  });
});
