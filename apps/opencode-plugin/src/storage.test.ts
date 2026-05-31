import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  claimPendingFeedback,
  getStorageDir,
  inboxPath,
  pendingPath,
  writeInbox,
  writePendingFeedback,
} from "./storage.ts";

let home = "";
let originalHome: string | undefined;

beforeEach(async () => {
  originalHome = process.env.HOME;
  home = await mkdtemp(join(tmpdir(), "opencode-storage-"));
  process.env.HOME = home;
});

afterEach(async () => {
  process.env.HOME = originalHome;
  await rm(home, { recursive: true, force: true });
});

describe("storage paths", () => {
  it("namespaces inbox and pending under ~/.symbiot/agents/opencode", () => {
    const base = join(home, ".symbiot", "agents", "opencode");
    expect(getStorageDir()).toBe(base);
    expect(inboxPath("ses_1")).toBe(join(base, "inbox", "ses_1.md"));
    expect(pendingPath("ses_1")).toBe(join(base, "pending", "ses_1.json"));
  });

  it("rejects a session id that is not a single safe path segment", () => {
    expect(() => inboxPath("../evil")).toThrow(/invalid sessionId/);
    expect(() => pendingPath("a/b")).toThrow(/invalid sessionId/);
  });
});

describe("writeInbox", () => {
  it("persists the response markdown atomically", async () => {
    await writeInbox("ses_2", "# Response\nbody\n");
    expect(await readFile(inboxPath("ses_2"), "utf8")).toBe("# Response\nbody\n");
  });
});

describe("pending feedback", () => {
  it("round-trips feedback through write and claim", async () => {
    await writePendingFeedback("ses_3", "expand the test plan");
    expect(await claimPendingFeedback("ses_3")).toBe("expand the test plan");
  });

  it("returns null when there is no pending feedback", async () => {
    expect(await claimPendingFeedback("ses_missing")).toBeNull();
  });

  it("consumes once — a second claim finds nothing", async () => {
    await writePendingFeedback("ses_4", "note");
    expect(await claimPendingFeedback("ses_4")).toBe("note");
    expect(await claimPendingFeedback("ses_4")).toBeNull();
  });
});
