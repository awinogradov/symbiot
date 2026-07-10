/**
 * Install / uninstall the symbiot Codex hook in `~/.codex/hooks.json`.
 *
 * Codex CLI's hook file uses the shared Claude-derived JSON shape, so this is a
 * thin binding over {@link createConfigHookInstaller}: only the target file
 * (`~/.codex/hooks.json`), the event (`Stop`, not tool-scoped), the seconds-unit
 * `timeout`, and the symbiot-entry matcher differ. Codex honors
 * `{"decision":"block","reason"}` directly on `Stop`, so there is no
 * `PermissionRequest` companion entry.
 *
 * The `command` is resolved by {@link resolveHookCommand}: in dev it points at
 * this app's source `cli.ts` (never the bundle, so the embedded viewer's relative
 * `dist/client/` path math stays intact); in a compiled binary it is the bare
 * `symbiot-codex run-hook`, resolved from `PATH` (`~/.local/bin`).
 *
 * @see ../../README.md — the `## Schemas` section pins the on-disk shape.
 * @see ../../../packages/symbiot-agent-runtime/src/config-installer.ts — the shared installer.
 */
import { homedir } from "node:os";
import { join } from "node:path";

import { createConfigHookInstaller } from "@symbiot/agent-runtime/config-installer";
import { resolveHookCommand } from "@symbiot/agent-runtime/hook-command";

/** A long timeout (seconds) — `run-hook` blocks while a human reviews the plan. */
const stopTimeoutSeconds = 3600;

const isSymbiotEntry = (command: string): boolean =>
  /apps\/codex\/(src|dist)\/cli\.(ts|js).*run-hook/.test(command) ||
  command === "symbiot-codex run-hook";

const cliCommand = (): string =>
  resolveHookCommand({ importMetaUrl: import.meta.url, binName: "symbiot-codex" });

export const { installHook, uninstallHook } = createConfigHookInstaller({
  // Resolve from `process.env.HOME` (not `os.homedir()`, which Bun caches at startup and
  // never re-reads) so tests can redirect it to a tmpdir; falls back to `homedir()` when unset.
  path: join(process.env.HOME || homedir(), ".codex", "hooks.json"),
  cliCommand,
  isSymbiotEntry,
  registerEvents: ["Stop"],
  entryExtras: { timeout: stopTimeoutSeconds, statusMessage: "Symbiot: opening plan reviewer…" },
});
