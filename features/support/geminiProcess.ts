import { join } from "node:path";

import { createCliReviewHook, type CliReviewHook } from "./reviewHook.ts";
import { repoRoot } from "./world.ts";

/**
 * Drives a real `symbiot-gemini run-hook` subprocess for the BDD round-trip smoke,
 * via the shared {@link createCliReviewHook} (OS-assigned port + throwaway HOME so it
 * runs safely under the parallel suite). The browser reviews the spawned hook's plan
 * at {@link GeminiHookController.baseUrl}, and the scenario asserts the Gemini-shaped
 * decision the hook writes to stdout on exit.
 *
 * @see ../../apps/gemini/README.md — the `## Schemas` section pins the decision shape.
 */

/** Per-scenario controller over one spawned gemini `run-hook` process. */
export type GeminiHookController = CliReviewHook;

const geminiCli = join(repoRoot, "apps", "gemini", "src", "cli.ts");

export const createGeminiHookController = (): GeminiHookController =>
  createCliReviewHook({ cli: geminiCli, label: "gemini" });
