// @vitest-environment happy-dom
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PlanResponse } from "../../shared/apiTypes.ts";

const { fetchPlanVersions, fetchPlanVersion } = vi.hoisted(() => ({
  fetchPlanVersions: vi.fn(),
  fetchPlanVersion: vi.fn(),
}));

vi.mock("../libs/apiClient.ts", () => ({ fetchPlanVersions, fetchPlanVersion }));

const { useVersionState } = await import("./useVersionState.ts");

const planAt = (version: number, mode: PlanResponse["mode"]): PlanResponse => ({
  plan: "# Boot\n",
  mode,
  meta: { project: "proj", slug: "plan", version, displayName: "proj" },
});

describe("useVersionState autoCompareOnBoot", () => {
  it("leads with the predecessor-diff overlay when a predecessor exists", async () => {
    fetchPlanVersions.mockResolvedValue({ versions: [1, 2], current: 2 });
    fetchPlanVersion.mockResolvedValue({
      plan: "# Prev\n",
      meta: { project: "proj", slug: "plan", version: 1, displayName: "proj" },
    });
    const { result } = renderHook(() =>
      useVersionState(planAt(2, "draft"), { autoCompareOnBoot: true })
    );
    await waitFor(() => expect(result.current.compareWithPredecessor).toBe(true));
  });

  it("stays in editing mode when the boot version has no predecessor", async () => {
    fetchPlanVersions.mockResolvedValue({ versions: [1], current: 1 });
    const { result } = renderHook(() =>
      useVersionState(planAt(1, "draft"), { autoCompareOnBoot: true })
    );
    await waitFor(() => expect(result.current.versions).toEqual([1]));
    expect(result.current.compareWithPredecessor).toBe(false);
  });

  it("never auto-compares without the option (plan/annotate modes unchanged)", async () => {
    fetchPlanVersions.mockResolvedValue({ versions: [1, 2], current: 2 });
    fetchPlanVersion.mockResolvedValue({
      plan: "# Prev\n",
      meta: { project: "proj", slug: "plan", version: 1, displayName: "proj" },
    });
    const { result } = renderHook(() => useVersionState(planAt(2, "plan")));
    await waitFor(() => expect(result.current.versions).toEqual([1, 2]));
    expect(result.current.compareWithPredecessor).toBe(false);
  });
});
