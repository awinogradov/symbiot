import { afterEach, describe, expect, it, vi } from "vitest";

import { emitBlockDecision, emitDecision } from "./decision.ts";

const captureStdout = (): { calls: () => string[] } => {
  const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  return { calls: () => spy.mock.calls.map((c) => String(c[0])) };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("emitBlockDecision", () => {
  it("emits the feedback as the block reason", async () => {
    const out = captureStdout();
    await emitBlockDecision("please add tests");
    expect(out.calls()).toEqual([
      JSON.stringify({ decision: "block", reason: "please add tests" }),
    ]);
  });

  it("falls back to a default reason when feedback is empty", async () => {
    const out = captureStdout();
    await emitBlockDecision("");
    expect(out.calls()).toEqual([
      JSON.stringify({ decision: "block", reason: "Reviewer requested changes." }),
    ]);
  });
});

describe("emitDecision", () => {
  it("approve emits nothing and exits 0", async () => {
    const out = captureStdout();
    expect(await emitDecision({ kind: "approve" })).toBe(0);
    expect(out.calls()).toEqual([]);
  });

  it("deny emits a block decision and exits 0", async () => {
    const out = captureStdout();
    expect(await emitDecision({ kind: "deny", feedback: "tighten the scope" })).toBe(0);
    expect(out.calls()).toEqual([
      JSON.stringify({ decision: "block", reason: "tighten the scope" }),
    ]);
  });
});
