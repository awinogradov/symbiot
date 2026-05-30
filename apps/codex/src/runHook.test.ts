import { afterEach, describe, expect, it, vi } from "vitest";

import { emitBlockDecision, emitDecision, planFromStop } from "./runHook.ts";

const captureStdout = (): { calls: () => string[] } => {
  const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  return { calls: () => spy.mock.calls.map((c) => String(c[0])) };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("planFromStop", () => {
  it("returns the message for a genuine Stop event", () => {
    expect(planFromStop({ hook_event_name: "Stop", last_assistant_message: "# Plan\n" })).toBe(
      "# Plan\n"
    );
  });

  it("passes through when a prior block re-triggered the turn (stop_hook_active)", () => {
    expect(
      planFromStop({
        hook_event_name: "Stop",
        last_assistant_message: "# Plan\n",
        stop_hook_active: true,
      })
    ).toBeNull();
  });

  it("passes through non-Stop events", () => {
    expect(
      planFromStop({ hook_event_name: "PreToolUse", last_assistant_message: "# Plan\n" })
    ).toBeNull();
  });

  it("passes through an empty or missing message", () => {
    expect(planFromStop({ hook_event_name: "Stop", last_assistant_message: "" })).toBeNull();
    expect(planFromStop({ hook_event_name: "Stop" })).toBeNull();
  });

  it("passes through non-object / null input", () => {
    expect(planFromStop(null)).toBeNull();
    expect(planFromStop(42)).toBeNull();
    expect(planFromStop("Stop")).toBeNull();
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
  it("approve emits nothing and exits 0 (Codex stops)", () => {
    const out = captureStdout();
    expect(emitDecision({ kind: "approve" })).toBe(0);
    expect(out.calls()).toEqual([]);
  });

  it("deny emits a block decision and exits 0 (Codex continues)", () => {
    const out = captureStdout();
    expect(emitDecision({ kind: "deny", feedback: "tighten the scope" })).toBe(0);
    expect(out.calls()).toEqual([
      JSON.stringify({ decision: "block", reason: "tighten the scope" }),
    ]);
  });
});
