import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const settingsPath = join(homedir(), ".claude", "settings.json");

/** Single hook entry stored in `~/.claude/settings.json` under an event/matcher. */
interface ClaudeHook {
  type: "command";
  command: string;
}

/** Group of hooks scoped to an optional tool matcher (e.g. `ExitPlanMode`). */
interface ClaudeHookGroup {
  matcher?: string;
  hooks: ClaudeHook[];
}

/**
 * Shape of `~/.claude/settings.json` as far as we care about it. Other top-level
 * keys (`mcpServers`, `theme`, …) ride along untouched via the index signature.
 */
interface ClaudeSettings {
  hooks?: Record<string, ClaudeHookGroup[]>;
  [key: string]: unknown;
}

const isSymbiotEntry = (command: string): boolean =>
  /apps\/hook\/(src|dist)\/cli\.(ts|js).*run-hook/.test(command) || command === "symbiot run-hook";

const cliCommand = (): string => {
  const here = fileURLToPath(import.meta.url);
  const srcCli = resolve(dirname(here), "cli.ts");
  return `bun ${srcCli} run-hook`;
};

const stripSymbiotEntries = (groups: ClaudeHookGroup[]): ClaudeHookGroup[] =>
  groups
    .map((g) => ({ ...g, hooks: g.hooks.filter((h) => !isSymbiotEntry(h.command)) }))
    .filter((g) => g.hooks.length > 0);

const ensureHook = (settings: ClaudeSettings, command: string): ClaudeSettings => {
  const hooks = settings.hooks ?? {};
  const existing = stripSymbiotEntries(hooks.Stop ?? []);
  const preExisting = stripSymbiotEntries(hooks.PreToolUse ?? []);
  const permExisting = stripSymbiotEntries(hooks.PermissionRequest ?? []);
  const symbiotGroup: ClaudeHookGroup = {
    matcher: "ExitPlanMode",
    hooks: [{ type: "command", command }],
  };
  return {
    ...settings,
    hooks: {
      ...hooks,
      Stop: existing,
      PreToolUse: [...preExisting, symbiotGroup],
      PermissionRequest: [...permExisting, symbiotGroup],
    },
  };
};

const readSettings = async (): Promise<ClaudeSettings> => {
  try {
    return JSON.parse(await readFile(settingsPath, "utf8")) as ClaudeSettings;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
};

/**
 * Idempotently register the symbiot hooks in `~/.claude/settings.json`:
 *
 *   - `PreToolUse(ExitPlanMode)` — drives the viewer; emits the `decision:"block"`
 *     deny path (bulletproof) and a `permissionDecision:"allow"` approve payload.
 *   - `PermissionRequest(ExitPlanMode)` — defensive workaround for
 *     anthropics/claude-code#50660. Reads the approve marker written by the
 *     PreToolUse run and echoes it back on the new hook event, so Claude Code
 *     can short-circuit its native "Accept this plan?" prompt once the event
 *     honors `permissionDecision` for ExitPlanMode. No-op until then.
 *
 * Strips any prior symbiot entries (including a deprecated Stop registration
 * shipped in earlier releases), then writes the current absolute-path command.
 * Other hooks in the file are untouched.
 */
export const installHook = async (): Promise<{ path: string; command: string }> => {
  const command = cliCommand();
  const current = await readSettings();
  const next = ensureHook(current, command);
  await mkdir(dirname(settingsPath), { recursive: true });
  await writeFile(settingsPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return { path: settingsPath, command };
};

const stripAllSymbiot = (settings: ClaudeSettings): { next: ClaudeSettings; removed: number } => {
  const hooks = settings.hooks ?? {};
  let removed = 0;
  const cleanedEntries = Object.entries(hooks).map(([event, groups]) => {
    const before = groups.flatMap((g) => g.hooks).length;
    const cleaned = stripSymbiotEntries(groups);
    removed += before - cleaned.flatMap((g) => g.hooks).length;
    return [event, cleaned] as const;
  });
  return {
    next: { ...settings, hooks: Object.fromEntries(cleanedEntries) },
    removed,
  };
};

/**
 * Remove every symbiot hook entry from `~/.claude/settings.json`, regardless of
 * which event (Stop, PreToolUse, …) it lives under. Other hooks are untouched.
 */
export const uninstallHook = async (): Promise<{ path: string; removed: number }> => {
  const current = await readSettings();
  const { next, removed } = stripAllSymbiot(current);
  if (removed === 0) return { path: settingsPath, removed };
  await writeFile(settingsPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return { path: settingsPath, removed };
};
