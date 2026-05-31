import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PluginInput } from "@opencode-ai/plugin";
import type { Part } from "@opencode-ai/sdk";
import type { RunningServer, StartServerOptions } from "@symbiot/viewer";

import type { MessageWithParts } from "./lastAssistantMessage.ts";
import { injectPendingFeedback, reviewSession } from "./plugin.ts";
import { claimPendingFeedback, inboxPath, writePendingFeedback } from "./storage.ts";

type Decision = Awaited<RunningServer["resolved"]>;
type OpencodeClient = PluginInput["client"];

let home = "";
let originalHome: string | undefined;

beforeEach(async () => {
  originalHome = process.env.HOME;
  home = await mkdtemp(join(tmpdir(), "opencode-plugin-"));
  process.env.HOME = home;
});

afterEach(async () => {
  process.env.HOME = originalHome;
  await rm(home, { recursive: true, force: true });
});

const assistantMessages = (text: string): MessageWithParts[] => [
  { info: { role: "assistant", time: { created: 1 } }, parts: [{ type: "text", text }] },
];

// Only `session.messages` is exercised; the rest of the SDK client is irrelevant here.
const fakeClient = (messages: MessageWithParts[]): OpencodeClient =>
  ({ session: { messages: async () => ({ data: messages }) } }) as unknown as OpencodeClient;

const stubServer = (resolved: Promise<Decision>, onStop: () => void): RunningServer => ({
  url: "http://127.0.0.1:0/",
  meta: { project: "p", slug: "s", version: 1, displayName: "p" },
  resolved,
  stop: async () => onStop(),
});

describe("reviewSession", () => {
  it("writes the inbox and persists feedback when the reviewer requests changes", async () => {
    await reviewSession(fakeClient(assistantMessages("# Plan\nbody")), "ses_a", {
      startServer: async () =>
        stubServer(Promise.resolve({ kind: "deny", feedback: "expand tests" }), () => {}),
      openInBrowser: false,
    });
    expect(await readFile(inboxPath("ses_a"), "utf8")).toBe("# Plan\nbody");
    expect(await claimPendingFeedback("ses_a")).toBe("expand tests");
  });

  it("writes no feedback on approve", async () => {
    await reviewSession(fakeClient(assistantMessages("# Plan")), "ses_b", {
      startServer: async () => stubServer(Promise.resolve({ kind: "approve" }), () => {}),
      openInBrowser: false,
    });
    expect(await claimPendingFeedback("ses_b")).toBeNull();
  });

  it("stops the server and writes no feedback when the review times out", async () => {
    let stopped = false;
    await reviewSession(fakeClient(assistantMessages("# Plan")), "ses_c", {
      startServer: async () =>
        stubServer(new Promise<Decision>(() => {}), () => {
          stopped = true;
        }),
      openInBrowser: false,
      timeoutMs: 5,
    });
    expect(stopped).toBe(true);
    expect(await claimPendingFeedback("ses_c")).toBeNull();
  });

  it("does not open a viewer when there is no assistant response", async () => {
    let opened = false;
    await reviewSession(fakeClient([]), "ses_d", {
      startServer: async (_options: StartServerOptions) => {
        opened = true;
        return stubServer(Promise.resolve({ kind: "approve" }), () => {});
      },
      openInBrowser: false,
    });
    expect(opened).toBe(false);
  });
});

describe("injectPendingFeedback", () => {
  it("prepends a synthetic feedback part and consumes the pending file", async () => {
    await writePendingFeedback("ses_e", "look again");
    const output: { parts: Part[] } = { parts: [] };
    await injectPendingFeedback({ sessionID: "ses_e", messageID: "msg_1" }, output);
    expect(output.parts).toHaveLength(1);
    expect(output.parts[0]).toMatchObject({
      type: "text",
      text: "[Reviewer feedback]: look again",
      synthetic: true,
    });
    expect(await claimPendingFeedback("ses_e")).toBeNull();
  });

  it("does nothing when there is no pending feedback", async () => {
    const output: { parts: Part[] } = { parts: [] };
    await injectPendingFeedback({ sessionID: "ses_none" }, output);
    expect(output.parts).toHaveLength(0);
  });
});
