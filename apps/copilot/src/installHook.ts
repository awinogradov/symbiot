/**
 * Install / uninstall the symbiot Copilot hook in
 * `~/.copilot/hooks/symbiot-copilot.json`.
 *
 * Copilot CLI loads command hooks from a **directory** of independent JSON files
 * under `~/.copilot/hooks/` (each `{ version: 1, hooks: { <event>: [...] } }`),
 * unlike Codex/Gemini which merge into one shared settings file. So symbiot owns
 * one dedicated file end to end, built on the shared {@link writeAtomic} /
 * {@link removeIfOwned} primitives: install writes it atomically, uninstall
 * deletes it only while it still carries the `_managedBy` ownership sentinel — a
 * hand-edited file is never blind-deleted.
 *
 * The gated event is `agentStop` (fires at turn end). `timeoutSec` is in
 * **seconds** (default 30), so a one-hour review block is `3600` — like Codex's
 * seconds, NOT Gemini's milliseconds. Copilot honors `{"decision":"block","reason"}`
 * on `agentStop` directly, so there is no `PermissionRequest` companion.
 *
 * @see ../README.md — the `## Schemas` section pins the on-disk shape.
 * @see ../../../docs/agents/copilot-contract.md — the audited upstream contract.
 */
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { removeIfOwned, writeAtomic } from "@symbiot/agent-runtime/managed-file";

const hookPath = join(homedir(), ".copilot", "hooks", "symbiot-copilot.json");

/** Ownership sentinel — `uninstall-hook` only deletes a file still carrying it. */
const managedBy = "symbiot-copilot";

/** A long timeout (**seconds**) — `run-hook` blocks while a human reviews the plan. */
const agentStopTimeoutSeconds = 3600;

const cliCommand = (): string =>
  `bun ${resolve(dirname(fileURLToPath(import.meta.url)), "cli.ts")} run-hook`;

const buildConfig = (command: string): string =>
  `${JSON.stringify(
    {
      version: 1,
      hooks: {
        agentStop: [
          { type: "command", command, timeoutSec: agentStopTimeoutSeconds, _managedBy: managedBy },
        ],
      },
    },
    null,
    2
  )}\n`;

const fileIsOwned = (raw: string): boolean => {
  try {
    const parsed = JSON.parse(raw) as { hooks?: { agentStop?: { _managedBy?: unknown }[] } };
    return (parsed.hooks?.agentStop ?? []).some((entry) => entry._managedBy === managedBy);
  } catch {
    return false;
  }
};

/**
 * Idempotently register the symbiot `agentStop` hook by writing
 * `~/.copilot/hooks/symbiot-copilot.json`. Re-running produces a byte-identical
 * file. The command points at source `cli.ts` (never a bundle) so the embedded
 * viewer's relative `dist/client/` path math stays intact. symbiot owns this file
 * outright — sibling hook files under `~/.copilot/hooks/` are untouched.
 */
export const installHook = async (): Promise<{ path: string; command: string }> => {
  const command = cliCommand();
  await writeAtomic(hookPath, buildConfig(command));
  return { path: hookPath, command };
};

/**
 * Remove symbiot's hook file from `~/.copilot/hooks/`. Deletes it only when it
 * still carries the `_managedBy` sentinel; a hand-edited or unparseable file is
 * left in place (reported as `removed: 0`, with a warning) so user content is
 * never destroyed.
 */
export const uninstallHook = async (): Promise<{ path: string; removed: number }> => {
  const removed = await removeIfOwned(hookPath, fileIsOwned, () =>
    process.stderr.write(
      `symbiot-copilot: ${hookPath} was modified by hand (no symbiot marker); leaving it untouched\n`
    )
  );
  return { path: hookPath, removed };
};
