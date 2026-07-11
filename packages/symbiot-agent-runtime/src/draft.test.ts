import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { RunningServer, StartServerOptions } from "@symbiot/viewer";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  blankDraftSeed,
  draftApprovedMarker,
  draftCancelledMarker,
  draftRevisionMarker,
  runDraft,
} from "./draft.ts";

type ReviewDecision = Awaited<RunningServer["resolved"]>;

interface StubState {
  receivedOptions: StartServerOptions | null;
}

const stubStartServer =
  (decision: ReviewDecision, state: StubState) =>
  async (options: StartServerOptions): Promise<RunningServer> => {
    state.receivedOptions = options;
    return {
      url: "http://127.0.0.1:0/",
      meta: { project: "p", slug: "s", version: 1, displayName: "p" },
      resolved: Promise.resolve(decision),
      stop: async () => undefined,
    };
  };

const run = async (
  argv: string[],
  decision: ReviewDecision
): Promise<{ code: number; stdout: string; options: StartServerOptions | null }> => {
  const state: StubState = { receivedOptions: null };
  const lines: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    lines.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  const code = await runDraft({
    argv,
    binName: "symbiot",
    agentId: "claude-code",
    indexHtmlGz: "/tmp/index.html.gz",
    startServer: stubStartServer(decision, state),
  });
  return { code, stdout: lines.join(""), options: state.receivedOptions };
};

const revisionPath = "/home/u/.symbiot/agents/claude-code/history/proj/my-plan/003.md";

describe("runDraft", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits the revision marker with the persisted path and a --slug re-run hint", async () => {
    const { code, stdout } = await run([], { kind: "draft", path: revisionPath, version: 3 });
    expect(code).toBe(0);
    expect(stdout.split("\n")[0]).toBe(`${draftRevisionMarker} ${revisionPath}`);
    expect(stdout).toContain("--slug my-plan");
  });

  it("emits the approved marker with the final path on approve", async () => {
    const { code, stdout } = await run([], { kind: "approve", path: revisionPath });
    expect(code).toBe(0);
    expect(stdout.split("\n")[0]).toBe(`${draftApprovedMarker} ${revisionPath}`);
  });

  it("emits the cancelled marker and exits 2 on a deny resolution", async () => {
    const { code, stdout } = await run([], { kind: "deny", feedback: "" });
    expect(code).toBe(2);
    expect(stdout.split("\n")[0]).toBe(draftCancelledMarker);
  });

  it("exits 1 without a marker on an unexpected feedback resolution", async () => {
    const { code, stdout } = await run([], { kind: "feedback", feedback: "note" });
    expect(code).toBe(1);
    expect(stdout).toBe("");
  });

  it("boots a blank session with the seed markdown, draft mode, and a minted unique slug", async () => {
    const { options } = await run([], { kind: "approve", path: revisionPath });
    expect(options?.plan).toBe(blankDraftSeed);
    expect(options?.mode).toBe("draft");
    expect(options?.slug).toMatch(/^draft-[0-9a-f]{8}$/);
  });

  it("reads the seed file and forwards an explicit --slug", async () => {
    const dir = await mkdtemp(join(tmpdir(), "symbiot-draft-test-"));
    const file = join(dir, "seed.md");
    await writeFile(file, "# Seeded\n");
    const { options } = await run([file, "--slug", "pinned"], {
      kind: "draft",
      path: revisionPath,
      version: 3,
    });
    expect(options?.plan).toBe("# Seeded\n");
    expect(options?.slug).toBe("pinned");
  });

  it("defers to the viewer's H1-derived slug for a seeded file without --slug", async () => {
    const dir = await mkdtemp(join(tmpdir(), "symbiot-draft-test-"));
    const file = join(dir, "seed.md");
    await writeFile(file, "# Seeded\n");
    const { options } = await run([file], { kind: "approve", path: revisionPath });
    expect(options?.slug).toBeUndefined();
  });

  it("rejects when the seed file does not exist", async () => {
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    await expect(
      runDraft({
        argv: ["/nonexistent/seed.md"],
        binName: "symbiot",
        agentId: "claude-code",
        indexHtmlGz: "/tmp/index.html.gz",
        startServer: stubStartServer({ kind: "approve" }, { receivedOptions: null }),
      })
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
});
