/**
 * Install / uninstall the symbiot hooks in `~/.claude/settings.json`.
 *
 * A thin binding over the shared {@link createConfigHookInstaller}. Registers the
 * `ExitPlanMode`-matched symbiot group under TWO events:
 *
 *   - `PreToolUse(ExitPlanMode)` — drives the viewer; emits the `decision:"block"`
 *     deny path (bulletproof) and a `permissionDecision:"allow"` approve payload.
 *   - `PermissionRequest(ExitPlanMode)` — defensive workaround for
 *     anthropics/claude-code#50660; reads the approve marker written by the
 *     PreToolUse run and echoes it back so Claude Code can short-circuit its native
 *     "Accept this plan?" prompt.
 *
 * A deprecated `Stop` registration shipped in earlier releases is strip-cleaned.
 * Unlike Codex/Gemini, the entry carries no `timeout` (Claude Code's plugin
 * `hooks/hooks.json` owns that). The `command` points at this app's source
 * `cli.ts` so the embedded viewer's relative `dist/client/` path math stays intact.
 *
 * @see ../../README.md — the hook lifecycle and on-disk shape.
 * @see ../../../packages/symbiot-agent-runtime/src/config-installer.ts — the shared installer.
 */
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createConfigHookInstaller } from "@symbiot/agent-runtime/config-installer";

// Recognize both the current `claude-code` and the historical `hook` workspace path
// (issue #163 rename) so a pre-rename dev install is still stripped on reinstall and
// uninstall; the `symbiot run-hook` literal covers the compiled-binary invocation.
const isSymbiotEntry = (command: string): boolean =>
  /apps\/(?:hook|claude-code)\/(src|dist)\/cli\.(ts|js).*run-hook/.test(command) ||
  command === "symbiot run-hook";

const cliCommand = (): string =>
  `bun ${resolve(dirname(fileURLToPath(import.meta.url)), "cli.ts")} run-hook`;

export const { installHook, uninstallHook } = createConfigHookInstaller({
  path: join(homedir(), ".claude", "settings.json"),
  cliCommand,
  isSymbiotEntry,
  registerEvents: ["PreToolUse", "PermissionRequest"],
  cleanEvents: ["Stop"],
  matcher: "ExitPlanMode",
  entryExtras: { statusMessage: "Symbiot: opening plan reviewer…" },
});
