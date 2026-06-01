import { join } from "node:path";

import { createCliReviewHook, type CliReviewHook } from "./reviewHook.ts";
import { repoRoot } from "./world.ts";

/**
 * Drives a real `symbiot-copilot run-hook` subprocess for the BDD round-trip smoke,
 * via the shared {@link createCliReviewHook} (OS-assigned port + throwaway HOME so it
 * runs safely under the parallel suite). The browser reviews the spawned hook's plan
 * at {@link CopilotHookController.baseUrl}, and the scenario asserts the Copilot-shaped
 * decision the hook writes to stdout on exit.
 *
 * Copilot's `agentStop` payload carries only a `transcriptPath` (no inline message), so
 * {@link preparePayload} rewrites that field to the committed transcript fixture's absolute
 * path. It also stamps a unique `sessionId` per spawn so the run-hook re-entrancy marker
 * (keyed on sessionId + plan hash) never carries across runs.
 *
 * @see ../../apps/copilot/README.md — the `## Schemas` section pins the decision shape.
 */

/** Per-scenario controller over one spawned copilot `run-hook` process. */
export type CopilotHookController = CliReviewHook;

const copilotCli = join(repoRoot, "apps", "copilot", "src", "cli.ts");
const transcriptFixturePath = join(repoRoot, "fixtures", "agents", "copilot-transcript.jsonl");

const preparePayload = (raw: string): string => {
  const payload = JSON.parse(raw) as Record<string, unknown>;
  payload.transcriptPath = transcriptFixturePath;
  payload.sessionId = `copilot-smoke-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return JSON.stringify(payload);
};

export const createCopilotHookController = (): CopilotHookController =>
  createCliReviewHook({ cli: copilotCli, label: "copilot", preparePayload });
