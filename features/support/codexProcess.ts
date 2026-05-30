import { spawn, type ChildProcess } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { expect } from "@playwright/test";

import { repoRoot } from "./world.ts";

/**
 * Drives a real `symbiot-codex run-hook` subprocess for the BDD round-trip
 * smoke. The hook is one-shot — it spawns its own viewer, blocks on the
 * reviewer, emits its Codex-shaped decision to stdout, then exits — so it can't
 * be a long-lived Playwright `webServer`. Each scenario spawns a fresh process
 * (the pinned port is free between scenarios under `workers: 1`) and reads the
 * captured stdout once the process exits to assert the agent-visible bytes.
 *
 * @see ../../apps/codex/README.md — the `## Schemas` section pins the decision shape.
 */

/** Fixed port for the spawned codex viewer — distinct from the 3210-3212 viewers. */
export const codexHookPort = 3213;

/** URL the browser navigates to in order to review the spawned hook's plan. */
export const codexHookBaseUrl = `http://127.0.0.1:${codexHookPort}`;

const codexCli = join(repoRoot, "apps", "codex", "src", "cli.ts");

/** Outcome of a finished `run-hook` process. */
export interface CodexHookResult {
  code: number | null;
  stdout: string;
}

/** Per-scenario controller over one spawned `run-hook` process. */
export interface CodexHookController {
  /** Spawn `run-hook` with `payloadPath` piped to stdin and wait until its viewer is reachable. */
  start: (payloadPath: string) => Promise<void>;
  /** Resolve once the process exits, with its exit code and full captured stdout. */
  result: () => Promise<CodexHookResult>;
  /** Kill the process if it is still running (scenario teardown). */
  dispose: () => Promise<void>;
}

export const createCodexHookController = (): CodexHookController => {
  let child: ChildProcess | null = null;
  let stdout = "";
  let exited: Promise<CodexHookResult> | null = null;

  const start = async (payloadPath: string): Promise<void> => {
    const payload = await readFile(payloadPath, "utf8");
    const proc = spawn(
      "bun",
      [codexCli, "run-hook", "--port", String(codexHookPort), "--no-open"],
      {
        cwd: repoRoot,
        stdio: ["pipe", "pipe", "inherit"],
      }
    );
    child = proc;
    proc.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    exited = new Promise((resolve) => {
      proc.on("close", (code) => resolve({ code, stdout }));
    });
    proc.stdin?.write(payload);
    proc.stdin?.end();
    await expect
      .poll(
        async (): Promise<boolean> => {
          try {
            const res = await fetch(`${codexHookBaseUrl}/api/plan`);
            return res.ok;
          } catch {
            return false;
          }
        },
        { timeout: 30_000, message: "codex run-hook viewer did not start" }
      )
      .toBe(true);
  };

  const result = async (): Promise<CodexHookResult> => {
    if (exited === null) throw new Error("codex run-hook was not started");
    return exited;
  };

  const dispose = async (): Promise<void> => {
    if (child !== null && child.exitCode === null) child.kill("SIGTERM");
  };

  return { start, result, dispose };
};
