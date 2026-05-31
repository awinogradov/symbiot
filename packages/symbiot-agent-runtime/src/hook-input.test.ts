import { afterEach, describe, expect, it } from "vitest";

import { createStopPlanExtractor, flagValue, parsePort, readHookInput } from "./hook-input.ts";

const originalStdin = Object.getOwnPropertyDescriptor(process, "stdin");

const stubStdin = (chunks: string[]): void => {
  Object.defineProperty(process, "stdin", {
    configurable: true,
    value: {
      async *[Symbol.asyncIterator](): AsyncGenerator<Uint8Array> {
        for (const chunk of chunks) yield Buffer.from(chunk, "utf8");
      },
    },
  });
};

afterEach(() => {
  if (originalStdin) Object.defineProperty(process, "stdin", originalStdin);
});

describe("createStopPlanExtractor", () => {
  // Codex (Stop / last_assistant_message) and Gemini (AfterAgent / prompt_response)
  // share this extractor; the Codex binding is exercised here.
  const planFromStop = createStopPlanExtractor({
    eventName: "Stop",
    messageField: "last_assistant_message",
  });

  it("returns the message for a genuine event", () => {
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

  it("passes through a non-matching event", () => {
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

  it("reads the configured message field for a different event", () => {
    const planFromAfterAgent = createStopPlanExtractor({
      eventName: "AfterAgent",
      messageField: "prompt_response",
    });
    expect(planFromAfterAgent({ hook_event_name: "AfterAgent", prompt_response: "# Plan\n" })).toBe(
      "# Plan\n"
    );
  });
});

describe("flagValue", () => {
  it("returns the value following the flag", () => {
    expect(flagValue(["--port", "4321"], "--port")).toBe("4321");
  });

  it("returns null when the flag is absent or trailing", () => {
    expect(flagValue([], "--port")).toBeNull();
    expect(flagValue(["--port"], "--port")).toBeNull();
  });
});

describe("parsePort", () => {
  it("parses a positive integer", () => {
    expect(parsePort("4321")).toBe(4321);
  });

  it("returns null for null or invalid input", () => {
    expect(parsePort(null)).toBeNull();
    expect(parsePort("0")).toBeNull();
    expect(parsePort("nope")).toBeNull();
  });
});

describe("readHookInput", () => {
  it("parses JSON pieced together across stdin chunks", async () => {
    stubStdin(['{"hook_event_name":"Stop",', '"last_assistant_message":"# Plan\\n"}']);
    expect(await readHookInput()).toEqual({
      hook_event_name: "Stop",
      last_assistant_message: "# Plan\n",
    });
  });

  it("returns {} on empty stdin", async () => {
    stubStdin([]);
    expect(await readHookInput()).toEqual({});
  });

  it("returns {} on malformed JSON (pass-through guard)", async () => {
    stubStdin(["{not-json"]);
    expect(await readHookInput()).toEqual({});
  });
});
