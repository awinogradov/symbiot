import { join } from "node:path";

import { createCliReviewHook, type CliReviewHook } from "./reviewHook.ts";
import { repoRoot } from "./world.ts";

/**
 * Drives a real `symbiot-codex run-hook` subprocess for the BDD round-trip smoke,
 * via the shared {@link createCliReviewHook} (OS-assigned port + throwaway HOME so it
 * runs safely under the parallel suite). The browser reviews the spawned hook's plan
 * at {@link CodexHookController.baseUrl}, and the scenario asserts the Codex-shaped
 * decision the hook writes to stdout on exit.
 *
 * @see ../../apps/codex/README.md — the `## Schemas` section pins the decision shape.
 */

/** Per-scenario controller over one spawned codex `run-hook` process. */
export type CodexHookController = CliReviewHook;

const codexCli = join(repoRoot, "apps", "codex", "src", "cli.ts");

export const createCodexHookController = (): CodexHookController =>
  createCliReviewHook({ cli: codexCli, label: "codex" });
