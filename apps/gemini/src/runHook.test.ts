import { afterEach, describe, expect, it, vi } from "vitest";

import { emitBlockDecision, emitDecision, planFromAfterAgent } from "./runHook.ts";

const captureStdout = (): { calls: () => string[] } => {
  const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  return { calls: () => spy.mock.calls.map((c) => String(c[0])) };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("planFromAfterAgent", () => {
  it("returns the message for a genuine AfterAgent event", () => {
    expect(planFromAfterAgent({ hook_event_name: "AfterAgent", prompt_response: "# Plan\n" })).toBe(
      "# Plan\n"
    );
  });

  it("passes through when a prior block re-triggered the turn (stop_hook_active)", () => {
    expect(
      planFromAfterAgent({
        hook_event_name: "AfterAgent",
        prompt_response: "# Plan\n",
        stop_hook_active: true,
      })
    ).toBeNull();
  });

  it("passes through non-AfterAgent events", () => {
    expect(
      planFromAfterAgent({ hook_event_name: "BeforeAgent", prompt_response: "# Plan\n" })
    ).toBeNull();
  });

  it("passes through an empty or missing response", () => {
    expect(planFromAfterAgent({ hook_event_name: "AfterAgent", prompt_response: "" })).toBeNull();
    expect(planFromAfterAgent({ hook_event_name: "AfterAgent" })).toBeNull();
  });

  it("passes through non-object / null input (malformed payload guard)", () => {
    expect(planFromAfterAgent(null)).toBeNull();
    expect(planFromAfterAgent(42)).toBeNull();
    expect(planFromAfterAgent("AfterAgent")).toBeNull();
    expect(planFromAfterAgent({})).toBeNull();
  });
});

describe("emitBlockDecision", () => {
  it("emits the feedback as the block reason", () => {
    const out = captureStdout();
    emitBlockDecision("please add tests");
    expect(out.calls()).toEqual([
      JSON.stringify({ decision: "block", reason: "please add tests" }),
    ]);
  });

  it("falls back to a default reason when feedback is empty", () => {
    const out = captureStdout();
    emitBlockDecision("");
    expect(out.calls()).toEqual([
      JSON.stringify({ decision: "block", reason: "Reviewer requested changes." }),
    ]);
  });
});

describe("emitDecision", () => {
  it("approve emits nothing and exits 0 (Gemini accepts the response)", () => {
    const out = captureStdout();
    expect(emitDecision({ kind: "approve" })).toBe(0);
    expect(out.calls()).toEqual([]);
  });

  it("deny emits a block decision and exits 0 (Gemini retries the turn)", () => {
    const out = captureStdout();
    expect(emitDecision({ kind: "deny", feedback: "tighten the scope" })).toBe(0);
    expect(out.calls()).toEqual([
      JSON.stringify({ decision: "block", reason: "tighten the scope" }),
    ]);
  });
});
