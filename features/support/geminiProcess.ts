import { spawn, type ChildProcess } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { expect } from "@playwright/test";

import { repoRoot } from "./world.ts";

/**
 * Drives a real `symbiot-gemini run-hook` subprocess for the BDD round-trip
 * smoke. The hook is one-shot — it spawns its own viewer, blocks on the
 * reviewer, emits its Gemini-shaped decision to stdout, then exits — so it can't
 * be a long-lived Playwright `webServer`. Each scenario spawns a fresh process
 * (the pinned port is free between scenarios under `workers: 1`) and reads the
 * captured stdout once the process exits to assert the agent-visible bytes.
 *
 * @see ../../apps/gemini/README.md — the `## Schemas` section pins the decision shape.
 */

/** Fixed port for the spawned gemini viewer — distinct from the 3210-3212 viewers and codex's 3213. */
export const geminiHookPort = 3214;

/** URL the browser navigates to in order to review the spawned hook's plan. */
export const geminiHookBaseUrl = `http://127.0.0.1:${geminiHookPort}`;

const geminiCli = join(repoRoot, "apps", "gemini", "src", "cli.ts");

/** Outcome of a finished `run-hook` process. */
export interface GeminiHookResult {
  code: number | null;
  stdout: string;
}

/** Per-scenario controller over one spawned `run-hook` process. */
export interface GeminiHookController {
  /** Spawn `run-hook` with `payloadPath` piped to stdin and wait until its viewer is reachable. */
  start: (payloadPath: string) => Promise<void>;
  /** Resolve once the process exits, with its exit code and full captured stdout. */
  result: () => Promise<GeminiHookResult>;
  /** Kill the process if it is still running (scenario teardown). */
  dispose: () => Promise<void>;
}

export const createGeminiHookController = (): GeminiHookController => {
  let child: ChildProcess | null = null;
  let stdout = "";
  let exited: Promise<GeminiHookResult> | null = null;

  const start = async (payloadPath: string): Promise<void> => {
    const payload = await readFile(payloadPath, "utf8");
    const proc = spawn(
      "bun",
      [geminiCli, "run-hook", "--port", String(geminiHookPort), "--no-open"],
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
            const res = await fetch(`${geminiHookBaseUrl}/api/plan`);
            return res.ok;
          } catch {
            return false;
          }
        },
        { timeout: 30_000, message: "gemini run-hook viewer did not start" }
      )
      .toBe(true);
  };

  const result = async (): Promise<GeminiHookResult> => {
    if (exited === null) throw new Error("gemini run-hook was not started");
    return exited;
  };

  const dispose = async (): Promise<void> => {
    if (child !== null && child.exitCode === null) child.kill("SIGTERM");
  };

  return { start, result, dispose };
};
