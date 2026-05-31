import { describe, expect, it } from "vitest";

import { extractLatestAssistantText, type MessageWithParts } from "./lastAssistantMessage.ts";

const message = (
  role: string,
  created: number,
  parts: { type: string; text?: string }[]
): MessageWithParts => ({ info: { role, time: { created } }, parts });

describe("extractLatestAssistantText", () => {
  it("returns '' when there are no assistant messages", () => {
    expect(extractLatestAssistantText([])).toBe("");
    expect(extractLatestAssistantText([message("user", 1, [{ type: "text", text: "hi" }])])).toBe(
      ""
    );
  });

  it("picks the most recent assistant message by created time, not array order", () => {
    const messages = [
      message("assistant", 30, [{ type: "text", text: "newest" }]),
      message("user", 20, [{ type: "text", text: "prompt" }]),
      message("assistant", 10, [{ type: "text", text: "older" }]),
    ];
    expect(extractLatestAssistantText(messages)).toBe("newest");
  });

  it("joins text parts and drops non-text parts (tool calls, reasoning)", () => {
    const messages = [
      message("assistant", 5, [
        { type: "text", text: "Plan:\n" },
        { type: "tool" },
        { type: "reasoning", text: "secret" },
        { type: "text", text: "- step one" },
      ]),
    ];
    expect(extractLatestAssistantText(messages)).toBe("Plan:\n- step one");
  });

  it("returns '' for an assistant message with no text parts", () => {
    expect(extractLatestAssistantText([message("assistant", 1, [{ type: "tool" }])])).toBe("");
  });
});
