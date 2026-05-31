import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect } from "@playwright/test";

import { repoRoot } from "./world.ts";

/**
 * Drives the in-process OpenCode plugin for the BDD round-trip smoke. Unlike the
 * Codex/Gemini/Copilot CLI hooks (real subprocesses reading stdin), OpenCode loads
 * its plugin in-process, so this spawns a Bun harness (`opencodeHarness.ts`) that
 * imports the plugin directly, opens its viewer on a pinned port, and reports the
 * inbox path + injected next-turn feedback once the reviewer submits.
 *
 * The harness runs with `HOME` redirected to a throwaway dir so its `~/.symbiot`
 * writes never touch the real home; `dispose` removes it.
 *
 * @see ../../apps/opencode-plugin/README.md — the fire-and-forget workaround.
 */

/** Fixed port for the harness viewer — distinct from 3210-3212, codex 3213, gemini 3214, copilot 3215. */
export const opencodeHookPort = 3216;

/** URL the browser navigates to in order to review the harness's response. */
export const opencodeHookBaseUrl = `http://127.0.0.1:${opencodeHookPort}`;

const harnessPath = join(repoRoot, "features", "opencode-harness.ts");
const fixturePath = join(repoRoot, "fixtures", "agents", "opencode-session-idle.json");

/** Outcome the harness reports once the review round trip finishes. */
export interface OpencodeHookResult {
  code: number | null;
  inboxPath: string;
  injected: string | null;
}

/** Per-scenario controller over one spawned harness process. */
export interface OpencodeHookController {
  /** Spawn the harness (HOME redirected) and wait until its viewer is reachable. */
  start: () => Promise<void>;
  /** Resolve once the harness exits, with its inbox path + injected feedback. */
  result: () => Promise<OpencodeHookResult>;
  /** Read the inbox file the harness wrote on `session.idle`. */
  inboxContents: () => Promise<string>;
  /** Kill the process if still running and remove the throwaway HOME (scenario teardown). */
  dispose: () => Promise<void>;
}

export const createOpencodeHookController = (): OpencodeHookController => {
  let child: ChildProcess | null = null;
  let home = "";
  let stdout = "";
  let exited: Promise<{ code: number | null; stdout: string }> | null = null;

  const start = async (): Promise<void> => {
    home = await mkdtemp(join(tmpdir(), "opencode-bdd-"));
    const proc = spawn("bun", [harnessPath, String(opencodeHookPort), fixturePath], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "inherit"],
      env: { ...process.env, HOME: home },
    });
    child = proc;
    proc.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    exited = new Promise((resolve) => {
      proc.on("close", (code) => resolve({ code, stdout }));
    });
    await expect
      .poll(
        async (): Promise<boolean> => {
          try {
            return (await fetch(`${opencodeHookBaseUrl}/api/plan`)).ok;
          } catch {
            return false;
          }
        },
        { timeout: 30_000, message: "opencode harness viewer did not start" }
      )
      .toBe(true);
  };

  const result = async (): Promise<OpencodeHookResult> => {
    if (exited === null) throw new Error("opencode harness was not started");
    const { code, stdout: out } = await exited;
    const lastLine = out.trim().split("\n").at(-1) ?? "{}";
    const parsed = JSON.parse(lastLine) as { inboxPath: string; injected: string | null };
    return { code, inboxPath: parsed.inboxPath, injected: parsed.injected };
  };

  const inboxContents = async (): Promise<string> => readFile((await result()).inboxPath, "utf8");

  const dispose = async (): Promise<void> => {
    if (child !== null && child.exitCode === null) child.kill("SIGTERM");
    if (home !== "") await rm(home, { recursive: true, force: true });
  };

  return { start, result, inboxContents, dispose };
};
