import { spawn, type ChildProcess } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { expect } from "@playwright/test";

import { repoRoot } from "./world.ts";

/**
 * Drives a real `symbiot-copilot run-hook` subprocess for the BDD round-trip
 * smoke. The hook is one-shot — it spawns its own viewer, blocks on the reviewer,
 * emits its Copilot-shaped decision to stdout, then exits — so it can't be a
 * long-lived Playwright `webServer`. Each scenario spawns a fresh process (the
 * pinned port is free between scenarios under `workers: 1`) and reads the captured
 * stdout once the process exits to assert the agent-visible bytes.
 *
 * Copilot's `agentStop` payload carries only a `transcriptPath` (no inline
 * message), so `start` rewrites that field to the committed transcript fixture's
 * absolute path. It also stamps a unique `sessionId` per spawn so the run-hook
 * re-entrancy marker (keyed on sessionId + plan hash) never carries across runs.
 *
 * @see ../../apps/copilot/README.md — the `## Schemas` section pins the decision shape.
 */

/** Fixed port for the spawned copilot viewer — distinct from the 3210-3212 viewers, codex's 3213, gemini's 3214. */
export const copilotHookPort = 3215;

/** URL the browser navigates to in order to review the spawned hook's plan. */
export const copilotHookBaseUrl = `http://127.0.0.1:${copilotHookPort}`;

const copilotCli = join(repoRoot, "apps", "copilot", "src", "cli.ts");
const transcriptFixturePath = join(repoRoot, "fixtures", "agents", "copilot-transcript.jsonl");

/** Outcome of a finished `run-hook` process. */
export interface CopilotHookResult {
  code: number | null;
  stdout: string;
}

/** Per-scenario controller over one spawned `run-hook` process. */
export interface CopilotHookController {
  /** Spawn `run-hook` with `payloadPath` (transcript path + sessionId rewritten) piped to stdin, and wait until its viewer is reachable. */
  start: (payloadPath: string) => Promise<void>;
  /** Resolve once the process exits, with its exit code and full captured stdout. */
  result: () => Promise<CopilotHookResult>;
  /** Kill the process if it is still running (scenario teardown). */
  dispose: () => Promise<void>;
}

export const createCopilotHookController = (): CopilotHookController => {
  let child: ChildProcess | null = null;
  let stdout = "";
  let exited: Promise<CopilotHookResult> | null = null;

  const start = async (payloadPath: string): Promise<void> => {
    const payload = JSON.parse(await readFile(payloadPath, "utf8")) as Record<string, unknown>;
    payload.transcriptPath = transcriptFixturePath;
    payload.sessionId = `copilot-smoke-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const proc = spawn(
      "bun",
      [copilotCli, "run-hook", "--port", String(copilotHookPort), "--no-open"],
      { cwd: repoRoot, stdio: ["pipe", "pipe", "inherit"] }
    );
    child = proc;
    proc.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    exited = new Promise((resolve) => {
      proc.on("close", (code) => resolve({ code, stdout }));
    });
    proc.stdin?.write(JSON.stringify(payload));
    proc.stdin?.end();
    await expect
      .poll(
        async (): Promise<boolean> => {
          try {
            const res = await fetch(`${copilotHookBaseUrl}/api/plan`);
            return res.ok;
          } catch {
            return false;
          }
        },
        { timeout: 30_000, message: "copilot run-hook viewer did not start" }
      )
      .toBe(true);
  };

  const result = async (): Promise<CopilotHookResult> => {
    if (exited === null) throw new Error("copilot run-hook was not started");
    return exited;
  };

  const dispose = async (): Promise<void> => {
    if (child !== null && child.exitCode === null) child.kill("SIGTERM");
  };

  return { start, result, dispose };
};
