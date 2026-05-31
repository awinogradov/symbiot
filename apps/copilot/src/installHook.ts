/**
 * Install / uninstall the symbiot Copilot hook in
 * `~/.copilot/hooks/symbiot-copilot.json`.
 *
 * Copilot CLI loads command hooks from a **directory** of independent JSON files
 * under `~/.copilot/hooks/` (each `{ version: 1, hooks: { <event>: [...] } }`),
 * unlike Codex/Gemini which merge into one shared settings file. So symbiot owns
 * one dedicated file end to end: install writes it (atomically), uninstall deletes
 * it — no read-modify-merge of foreign entries. An `_managedBy` ownership sentinel
 * guards uninstall so a hand-edited file is never blind-deleted.
 *
 * The gated event is `agentStop` (fires at turn end). `timeoutSec` is in
 * **seconds** (default 30), so a one-hour review block is `3600` — like Codex's
 * seconds, NOT Gemini's milliseconds. Copilot honors `{"decision":"block","reason"}`
 * on `agentStop` directly, so there is no `PermissionRequest` companion.
 *
 * @example
 *   const { path, command } = await installHook();
 *   // path === "~/.copilot/hooks/symbiot-copilot.json"
 *
 * @see ../README.md — the `## Schemas` section pins the on-disk shape.
 * @see ../../../docs/agents/copilot-contract.md — the audited upstream contract.
 */
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const hooksDir = join(homedir(), ".copilot", "hooks");
const hookPath = join(hooksDir, "symbiot-copilot.json");

/** Ownership sentinel — `uninstall-hook` only deletes a file still carrying it. */
const managedBy = "symbiot-copilot";

/** A long timeout (**seconds**) — `run-hook` blocks while a human reviews the plan. */
const agentStopTimeoutSeconds = 3600;

/** Single `agentStop` command-hook entry, including the symbiot ownership sentinel. */
interface CopilotHook {
  type: "command";
  command: string;
  timeoutSec: number;
  /** Not part of Copilot's schema (rides along ignored); marks this file as symbiot-owned. */
  _managedBy: string;
}

/** Shape of `~/.copilot/hooks/symbiot-copilot.json` — symbiot owns this file entirely. */
interface CopilotHookFile {
  version: 1;
  hooks: { agentStop: CopilotHook[] };
}

const cliCommand = (): string => {
  const here = fileURLToPath(import.meta.url);
  const srcCli = resolve(dirname(here), "cli.ts");
  return `bun ${srcCli} run-hook`;
};

const buildConfig = (command: string): CopilotHookFile => ({
  version: 1,
  hooks: {
    agentStop: [
      { type: "command", command, timeoutSec: agentStopTimeoutSeconds, _managedBy: managedBy },
    ],
  },
});

/** Atomic write — tmp sibling + `rename`, so a crash never leaves half-written JSON. */
const writeAtomic = async (path: string, contents: string): Promise<void> => {
  const tmp = `${path}.${process.pid}.tmp`;
  await writeFile(tmp, contents, "utf8");
  await rename(tmp, path);
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
  await mkdir(hooksDir, { recursive: true });
  await writeAtomic(hookPath, `${JSON.stringify(buildConfig(command), null, 2)}\n`);
  return { path: hookPath, command };
};

const fileIsOwned = (raw: string): boolean => {
  try {
    const parsed = JSON.parse(raw) as { hooks?: { agentStop?: { _managedBy?: unknown }[] } };
    const entries = parsed.hooks?.agentStop ?? [];
    return entries.some((entry) => entry._managedBy === managedBy);
  } catch {
    return false;
  }
};

const readOwnership = async (): Promise<"ours" | "foreign" | "absent"> => {
  let raw: string;
  try {
    raw = await readFile(hookPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "absent";
    throw error;
  }
  return fileIsOwned(raw) ? "ours" : "foreign";
};

/**
 * Remove symbiot's hook file from `~/.copilot/hooks/`. Deletes the file only when
 * it still carries the `_managedBy` ownership sentinel; a hand-edited or
 * unparseable file is left in place (reported as `removed: 0`, with a warning to
 * stderr) so user content is never destroyed. `removed` is `1` when symbiot's file
 * was deleted, else `0`.
 */
export const uninstallHook = async (): Promise<{ path: string; removed: number }> => {
  const ownership = await readOwnership();
  if (ownership === "foreign") {
    process.stderr.write(
      `symbiot-copilot: ${hookPath} was modified by hand (no symbiot marker); leaving it untouched\n`
    );
  }
  if (ownership !== "ours") return { path: hookPath, removed: 0 };
  await unlink(hookPath);
  return { path: hookPath, removed: 1 };
};
