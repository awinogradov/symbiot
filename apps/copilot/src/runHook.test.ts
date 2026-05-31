import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

// Set HOME before importing the module so its `~/.symbiot/hook-state` path
// (resolved at module load) lands in an isolated temp dir for the marker tests.
const homeRoot = await mkdtemp(join(tmpdir(), "symbiot-copilot-runhook-test-"));
process.env.HOME = homeRoot;

const {
  parseAgentStop,
  extractLastAssistantMessage,
  emitBlockDecision,
  emitDecision,
  isReentrant,
  recordMarker,
} = await import("./runHook.ts");

const captureStdout = (): { calls: () => string[] } => {
  const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  return { calls: () => spy.mock.calls.map((c) => String(c[0])) };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("parseAgentStop", () => {
  it("accepts a genuine end_turn event with a transcript path", () => {
    expect(
      parseAgentStop({ sessionId: "s1", transcriptPath: "/t.jsonl", stopReason: "end_turn" })
    ).toEqual({ sessionId: "s1", transcriptPath: "/t.jsonl", stopReason: "end_turn" });
  });

  it("defaults a missing sessionId to an empty string", () => {
    expect(parseAgentStop({ transcriptPath: "/t.jsonl", stopReason: "end_turn" })?.sessionId).toBe(
      ""
    );
  });

  it("rejects a non-end_turn stopReason", () => {
    expect(parseAgentStop({ transcriptPath: "/t.jsonl", stopReason: "other" })).toBeNull();
  });

  it("rejects a missing or empty transcriptPath", () => {
    expect(parseAgentStop({ stopReason: "end_turn" })).toBeNull();
    expect(parseAgentStop({ transcriptPath: "", stopReason: "end_turn" })).toBeNull();
  });

  it("rejects non-object / null input (malformed payload guard)", () => {
    expect(parseAgentStop(null)).toBeNull();
    expect(parseAgentStop(42)).toBeNull();
    expect(parseAgentStop("end_turn")).toBeNull();
  });
});

describe("extractLastAssistantMessage", () => {
  it("returns the last assistant message from Claude-style content blocks", () => {
    const jsonl = [
      JSON.stringify({ type: "user", message: { role: "user", content: "hi" } }),
      JSON.stringify({
        type: "assistant",
        message: { role: "assistant", content: [{ type: "text", text: "# Plan\n" }] },
      }),
    ].join("\n");
    expect(extractLastAssistantMessage(jsonl)).toBe("# Plan\n");
  });

  it("supports a top-level role with string content and returns the last one", () => {
    const jsonl = [
      JSON.stringify({ role: "assistant", content: "first" }),
      JSON.stringify({ role: "assistant", content: "second" }),
    ].join("\n");
    expect(extractLastAssistantMessage(jsonl)).toBe("second");
  });

  it("skips an unparseable (partial tail) first line and trailing user turns", () => {
    const jsonl = [
      "}partial-broken-line-from-tail-read",
      JSON.stringify({ role: "assistant", content: "the plan" }),
      JSON.stringify({ role: "user", content: "thanks" }),
    ].join("\n");
    expect(extractLastAssistantMessage(jsonl)).toBe("the plan");
  });

  it("returns null when no assistant message is present or input is junk", () => {
    expect(extractLastAssistantMessage(JSON.stringify({ role: "user", content: "x" }))).toBeNull();
    expect(extractLastAssistantMessage("not json at all")).toBeNull();
    expect(extractLastAssistantMessage("")).toBeNull();
  });
});

describe("re-entrancy guard", () => {
  it("flags an identical (session, plan) recorded within the TTL", async () => {
    await recordMarker("session-a", "# Plan A");
    expect(await isReentrant("session-a", "# Plan A")).toBe(true);
  });

  it("does not flag a different plan or a different session", async () => {
    await recordMarker("session-b", "# Plan B");
    expect(await isReentrant("session-b", "# Plan B revised")).toBe(false);
    expect(await isReentrant("session-c", "# Plan B")).toBe(false);
  });

  it("does not flag when no marker exists, and no-ops on an empty sessionId", async () => {
    expect(await isReentrant("never-recorded", "# Plan")).toBe(false);
    await recordMarker("", "# Plan");
    expect(await isReentrant("", "# Plan")).toBe(false);
  });
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
  it("approve emits nothing and exits 0 (Copilot lets the turn end)", async () => {
    const out = captureStdout();
    expect(await emitDecision({ kind: "approve" })).toBe(0);
    expect(out.calls()).toEqual([]);
  });

  it("deny emits a block decision and exits 0 (Copilot retries the turn)", async () => {
    const out = captureStdout();
    expect(await emitDecision({ kind: "deny", feedback: "tighten the scope" })).toBe(0);
    expect(out.calls()).toEqual([
      JSON.stringify({ decision: "block", reason: "tighten the scope" }),
    ]);
  });
});
