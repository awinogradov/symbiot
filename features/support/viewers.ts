import { spawn, type ChildProcess } from "node:child_process";
import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import { createInterface } from "node:readline";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect } from "@playwright/test";

import { fixturePlanSlug, fixtureProjectSlug } from "./testAssets.ts";
import { repoRoot } from "./world.ts";

/**
 * Per-worker viewer infrastructure for the parallel BDD suite.
 *
 * Playwright's `webServer` block is global — one set of servers shared by every
 * worker — so it cannot isolate the mutable state (decision files, `~/.symbiot`
 * history/drafts) that concurrent scenarios collide on. Instead each worker boots
 * its OWN plan / annotate / no-heading viewers via a worker-scoped fixture (see
 * {@link ./bdd.ts}), each on an OS-assigned port with a private `HOME` and private
 * decision files. OS-assigned ports (the viewer binds `port ?? 0`) are collision-proof
 * by construction — the kernel never hands two listeners the same free port — which
 * is why this does not shard ports by worker index.
 *
 * @example
 * ```ts
 * const worker = await startWorkerViewers();
 * // worker.instances.planUrl → "http://127.0.0.1:<port>/"
 * await worker.stop();
 * ```
 */

/** Markdown plan booted by the plan + annotate viewers (carries every supported element). */
const planPath = join(repoRoot, "fixtures", "markdown", "elements.md");
/** Headingless plan booted by the no-heading viewer so the no-H1 document-title fallback is exercised. */
const noHeadingPlanPath = join(repoRoot, "fixtures", "markdown", "no-heading.md");
/** Viewer CLI entrypoint spawned once per mode, per worker. */
const viewerBin = join(repoRoot, "apps", "viewer", "src", "bin.ts");
/** Prefix for each worker's throwaway `HOME` under the OS temp dir; teardown removes its own dir. */
const homePrefix = join(tmpdir(), "symbiot-bdd-w-");

/** How long a single viewer gets to print its listening URL and answer `/api/plan`. */
const bootTimeoutMs = 30_000;
/** Matches the `symbiot viewer listening at http://127.0.0.1:<port>/` line the viewer prints on boot. */
const listeningRe = /listening at (http:\/\/127\.0\.0\.1:\d+\/)/;

/** Resolved URLs + per-worker state paths handed to the worker-scoped `viewers` fixture. */
export interface ViewerInstances {
  /** Plan-mode viewer (Approve / Deny) — also the suite's `baseURL`. */
  planUrl: string;
  /** Annotate-mode viewer (Submit feedback). */
  annotateUrl: string;
  /** Headingless-plan viewer for the document-title no-H1 fallback. */
  noHeadingUrl: string;
  /** This worker's isolated `HOME`; `~/.symbiot` state lives under here. */
  home: string;
  /** Where the plan-mode viewer writes each Approve/Deny decision. */
  planDecisionFile: string;
  /** Where the annotate-mode viewer writes each Submit-feedback decision. */
  annotateDecisionFile: string;
}

/** A worker's running viewers plus the teardown that kills them and removes its `HOME`. */
export interface WorkerViewers {
  instances: ViewerInstances;
  stop: () => Promise<void>;
}

interface SpawnedViewer {
  child: ChildProcess;
  url: string;
}

/** Resolve once the child prints its listening URL; reject if it exits first or times out. */
const waitForListening = async (child: ChildProcess, label: string): Promise<string> => {
  let url: string | null = null;
  let stderr = "";
  let ended = false;
  child.stderr?.on("data", (chunk: Buffer) => {
    stderr += chunk.toString("utf8");
  });
  // A line reader stays attached for the child's lifetime so stdout keeps draining
  // and the OS pipe buffer never fills under `--keep-alive`.
  const reader = createInterface({ input: child.stdout! });
  reader.on("line", (line: string) => {
    const [, captured] = listeningRe.exec(line) ?? [];
    if (captured !== undefined) url = captured;
  });
  child.on("exit", () => {
    ended = true;
  });
  child.on("error", () => {
    ended = true;
  });
  await expect
    .poll(() => url !== null || ended, {
      timeout: bootTimeoutMs,
      message: `${label} viewer did not print a listening URL within ${bootTimeoutMs}ms`,
    })
    .toBe(true);
  if (url === null) throw new Error(`${label} viewer exited before listening\n${stderr}`);
  return url;
};

/** Poll `<url>api/plan` until it answers OK, so a worker never starts tests against a half-booted viewer. */
const waitForHttpReady = async (url: string, label: string): Promise<void> => {
  await expect
    .poll(
      async (): Promise<boolean> => {
        try {
          return (await fetch(`${url}api/plan`)).ok;
        } catch {
          return false;
        }
      },
      { timeout: bootTimeoutMs, message: `${label} viewer never answered /api/plan` }
    )
    .toBe(true);
};

const spawnViewer = async (
  home: string,
  plan: string,
  mode: "plan" | "annotate",
  decisionFile: string | null,
  label: string
): Promise<SpawnedViewer> => {
  const args = [viewerBin, "--plan", plan, "--no-open", "--keep-alive", "--mode", mode];
  if (decisionFile !== null) args.push("--decision-file", decisionFile);
  const child = spawn("bun", args, {
    cwd: repoRoot,
    env: { ...process.env, HOME: home },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const url = await waitForListening(child, label);
  await waitForHttpReady(url, label);
  return { child, url };
};

/** SIGTERM a viewer and resolve once it has exited (the viewer's keep-alive loop handles SIGTERM). */
const killViewer = (child: ChildProcess): Promise<void> => {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise<void>((resolve) => {
    child.once("exit", () => resolve());
    child.kill("SIGTERM");
  });
};

/**
 * Boot one worker's plan / annotate / no-heading viewers under a fresh `HOME`,
 * seeding the predecessor `001.md` so the plan viewer boots as version `002.md`
 * (what `predecessor-diff.feature` asserts against). Transactional: any failure
 * tears down whatever already started and removes the `HOME` before rethrowing,
 * because Playwright skips fixture teardown when setup throws before yielding.
 */
export const startWorkerViewers = async (): Promise<WorkerViewers> => {
  const home = await mkdtemp(homePrefix);
  const started: ChildProcess[] = [];
  const cleanup = async (): Promise<void> => {
    await Promise.all(started.map(killViewer));
    await rm(home, { recursive: true, force: true });
  };
  try {
    const historyDir = join(
      home,
      ".symbiot",
      "agents",
      "claude-code",
      "history",
      fixtureProjectSlug,
      fixturePlanSlug
    );
    await mkdir(historyDir, { recursive: true });
    await cp(planPath, join(historyDir, "001.md"));

    const planDecisionFile = join(home, "last-decision.json");
    const annotateDecisionFile = join(home, "annotate-decision.json");

    const plan = await spawnViewer(home, planPath, "plan", planDecisionFile, "plan");
    started.push(plan.child);
    const annotate = await spawnViewer(
      home,
      planPath,
      "annotate",
      annotateDecisionFile,
      "annotate"
    );
    started.push(annotate.child);
    const noHeading = await spawnViewer(home, noHeadingPlanPath, "plan", null, "no-heading");
    started.push(noHeading.child);

    return {
      instances: {
        planUrl: plan.url,
        annotateUrl: annotate.url,
        noHeadingUrl: noHeading.url,
        home,
        planDecisionFile,
        annotateDecisionFile,
      },
      stop: cleanup,
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
};
