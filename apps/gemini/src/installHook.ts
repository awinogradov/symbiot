/**
 * Install / uninstall the symbiot Gemini hook in `~/.gemini/settings.json`.
 *
 * Gemini CLI's hooks use the shared Claude-derived JSON shape, so this is a thin
 * binding over {@link createConfigHookInstaller}. Only the target file
 * (`~/.gemini/settings.json`), the event (`AfterAgent`, not tool-scoped), the
 * entry `name`, and the `timeout` UNIT differ: Gemini measures `timeout` in
 * **milliseconds** (default 60000), so a one-hour review block is `3600000`, NOT
 * the `3600` seconds Codex uses (Claude Code sets no hook timeout). Gemini honors
 * `{"decision":"block","reason"}` on `AfterAgent` directly, so there is no
 * `PermissionRequest` companion entry.
 *
 * @see ../../README.md — the `## Schemas` section pins the on-disk shape.
 * @see ../../codex/src/installHook.ts — the Codex counterpart (timeout in seconds).
 */
import { homedir } from "node:os";
import { join } from "node:path";

import { createConfigHookInstaller } from "@symbiot/agent-runtime/config-installer";
import { resolveHookCommand } from "@symbiot/agent-runtime/hook-command";

/** A long timeout — Gemini's hook `timeout` is in **milliseconds**, so this is one hour. */
const afterAgentTimeoutMs = 3_600_000;

const isSymbiotEntry = (command: string): boolean =>
  /apps\/gemini\/(src|dist)\/cli\.(ts|js).*run-hook/.test(command) ||
  command === "symbiot-gemini run-hook";

const cliCommand = (): string =>
  resolveHookCommand({ importMetaUrl: import.meta.url, binName: "symbiot-gemini" });

export const { installHook, uninstallHook } = createConfigHookInstaller({
  path: join(homedir(), ".gemini", "settings.json"),
  cliCommand,
  isSymbiotEntry,
  registerEvents: ["AfterAgent"],
  entryExtras: {
    name: "symbiot-gemini",
    timeout: afterAgentTimeoutMs,
    statusMessage: "Symbiot: opening plan reviewer…",
  },
});
