import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createInterface } from "node:readline";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect } from "@playwright/test";

import { repoRoot } from "./world.ts";

/**
 * Shared driver for the CLI agent round-trip smokes (codex / gemini / copilot).
 *
 * Each agent's `run-hook` is one-shot — it spawns its own viewer, blocks on the
 * reviewer, emits its agent-shaped decision to stdout, then exits. Under the parallel
 * suite every spawn binds an OS-assigned port (no `--port`) and runs under a throwaway
 * `HOME`, so concurrent scenarios never collide on a port or on `~/.symbiot`. The
 * viewer URL is read from the `symbiot-<agent>: review plan at <url>` line the hook
 * prints to stderr; stdout stays reserved for the decision bytes the scenario asserts.
 */

/** Outcome of a finished `run-hook` process. */
export interface CliReviewHookResult {
  code: number | null;
  stdout: string;
}

/** Per-scenario controller over one spawned `run-hook` process. */
export interface CliReviewHook {
  /** URL of the spawned hook's viewer — populated by {@link start}, empty before. */
  readonly baseUrl: string;
  /** Spawn `run-hook` with `payloadPath` piped to stdin and wait until its viewer is reachable. */
  start: (payloadPath: string) => Promise<void>;
  /** Resolve once the process exits, with its exit code and full captured stdout. */
  result: () => Promise<CliReviewHookResult>;
  /** Kill the process if it is still running and remove the throwaway HOME (scenario teardown). */
  dispose: () => Promise<void>;
}

/** Configuration distinguishing one agent's hook from another. */
export interface CliReviewHookOptions {
  /** Absolute path to the agent CLI entry (e.g. `apps/codex/src/cli.ts`). */
  cli: string;
  /** Agent slug used in error messages and the throwaway-HOME prefix. */
  label: string;
  /** Optional stdin transform (copilot rewrites the transcript path + session id); defaults to identity. */
  preparePayload?: (raw: string) => string;
}

const bootTimeoutMs = 30_000;
/** Matches the `symbiot-<agent>: review plan at http://127.0.0.1:<port>/` line the hook prints to stderr. */
const reviewUrlRe = /review plan at (http:\/\/127\.0\.0\.1:\d+\/)/;

/** Resolve with the viewer URL the hook prints to stderr; reject if it exits first or times out. */
const waitForReviewUrl = async (proc: ChildProcess, label: string): Promise<string> => {
  let url: string | null = null;
  let stderr = "";
  let ended = false;
  const reader = createInterface({ input: proc.stderr! });
  reader.on("line", (line: string) => {
    stderr += `${line}\n`;
    const [, captured] = reviewUrlRe.exec(line) ?? [];
    if (captured !== undefined) url = captured;
  });
  proc.on("exit", () => {
    ended = true;
  });
  proc.on("error", () => {
    ended = true;
  });
  await expect
    .poll(() => url !== null || ended, {
      timeout: bootTimeoutMs,
      message: `${label} run-hook did not print a review URL within ${bootTimeoutMs}ms`,
    })
    .toBe(true);
  if (url === null)
    throw new Error(`${label} run-hook exited before printing a review URL\n${stderr}`);
  return url;
};

/** Poll `<baseUrl>api/plan` until the spawned hook's viewer answers OK. */
const waitForHookReady = async (baseUrl: string, label: string): Promise<void> => {
  await expect
    .poll(
      async (): Promise<boolean> => {
        try {
          return (await fetch(`${baseUrl}api/plan`)).ok;
        } catch {
          return false;
        }
      },
      { timeout: bootTimeoutMs, message: `${label} run-hook viewer did not answer /api/plan` }
    )
    .toBe(true);
};

export const createCliReviewHook = ({
  cli,
  label,
  preparePayload,
}: CliReviewHookOptions): CliReviewHook => {
  let child: ChildProcess | null = null;
  let home = "";
  let stdout = "";
  let baseUrl = "";
  let exited: Promise<CliReviewHookResult> | null = null;

  const start = async (payloadPath: string): Promise<void> => {
    const raw = await readFile(payloadPath, "utf8");
    const payload = preparePayload ? preparePayload(raw) : raw;
    home = await mkdtemp(join(tmpdir(), `symbiot-bdd-${label}-`));
    const proc = spawn("bun", [cli, "run-hook", "--no-open"], {
      cwd: repoRoot,
      env: { ...process.env, HOME: home },
      stdio: ["pipe", "pipe", "pipe"],
    });
    child = proc;
    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    exited = new Promise((resolve) => {
      proc.on("close", (code) => resolve({ code, stdout }));
    });
    proc.stdin.write(payload);
    proc.stdin.end();
    baseUrl = await waitForReviewUrl(proc, label);
    await waitForHookReady(baseUrl, label);
  };

  const result = async (): Promise<CliReviewHookResult> => {
    if (exited === null) throw new Error(`${label} run-hook was not started`);
    return exited;
  };

  const dispose = async (): Promise<void> => {
    if (child !== null && child.exitCode === null) child.kill("SIGTERM");
    if (exited !== null) await exited;
    if (home !== "") await rm(home, { recursive: true, force: true });
  };

  return {
    get baseUrl(): string {
      return baseUrl;
    },
    start,
    result,
    dispose,
  };
};
