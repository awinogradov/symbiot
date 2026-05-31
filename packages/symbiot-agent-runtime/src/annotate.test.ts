import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { RunningServer, StartServerOptions } from "@symbiot/viewer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runAnnotate } from "./annotate.ts";

type ReviewDecision = Awaited<RunningServer["resolved"]>;

const stubStartServer =
  (decision: ReviewDecision, received: { options: StartServerOptions | null }) =>
  async (options: StartServerOptions): Promise<RunningServer> => {
    received.options = options;
    return {
      url: "http://127.0.0.1:0/",
      meta: { project: "p", slug: "s", version: 1, displayName: "p" },
      resolved: Promise.resolve(decision),
      stop: async () => {},
    };
  };

const captureStdout = (): { calls: () => string[] } => {
  const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  return { calls: () => spy.mock.calls.map((c) => String(c[0])) };
};

let dir: string;
let file: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "symbiot-annotate-"));
  file = join(dir, "notes.md");
  await writeFile(file, "# Doc\n", "utf8");
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(dir, { recursive: true, force: true });
});

describe("runAnnotate", () => {
  it("prints submitted feedback to stdout and exits 0", async () => {
    const out = captureStdout();
    const received: { options: StartServerOptions | null } = { options: null };
    const code = await runAnnotate({
      filePath: file,
      binName: "symbiot-codex",
      agentId: "codex",
      indexHtmlGz: "/tmp/index.html.gz",
      startServer: stubStartServer({ kind: "feedback", feedback: "tighten scope" }, received),
    });
    expect(code).toBe(0);
    expect(out.calls()).toContain("tighten scope\n");
    expect(received.options).toMatchObject({ plan: "# Doc\n", mode: "annotate", agentId: "codex" });
  });

  it("exits 1 on a non-feedback resolution", async () => {
    captureStdout();
    const received: { options: StartServerOptions | null } = { options: null };
    const code = await runAnnotate({
      filePath: file,
      binName: "symbiot-codex",
      agentId: "codex",
      indexHtmlGz: "/tmp/index.html.gz",
      startServer: stubStartServer({ kind: "approve" }, received),
    });
    expect(code).toBe(1);
  });

  it("exits 64 on a missing file path", async () => {
    const code = await runAnnotate({
      filePath: undefined,
      binName: "symbiot-codex",
      agentId: "codex",
      indexHtmlGz: "/tmp/index.html.gz",
    });
    expect(code).toBe(64);
  });
});
