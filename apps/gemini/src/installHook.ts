/**
 * Install / uninstall the symbiot Gemini hook in `~/.gemini/settings.json`.
 *
 * Gemini CLI's hooks live in `settings.json` under a top-level `hooks` object
 * keyed by event name — the same Claude-derived JSON shape Codex uses, so this
 * mirrors `apps/codex/src/installHook.ts`. Only the target file
 * (`~/.gemini/settings.json`), the event (`AfterAgent`, not tool-scoped), and
 * the `timeout` UNIT differ: Gemini measures hook `timeout` in **milliseconds**
 * (default 60000), so a one-hour review block is `3600000`, NOT the `3600`
 * seconds Codex/Claude use. Gemini honors `{"decision":"block","reason"}` on
 * `AfterAgent` directly, so there is no `PermissionRequest` companion entry.
 *
 * @example
 *   const { path, command } = await installHook();
 *   // path === "~/.gemini/settings.json", command === "bun /…/cli.ts run-hook"
 *
 * @see ../../README.md — the `## Schemas` section pins the on-disk shape.
 * @see ../../codex/src/installHook.ts — the Codex counterpart (timeout in seconds).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const settingsPath = join(homedir(), ".gemini", "settings.json");

/**
 * A long timeout — `run-hook` blocks while a human reviews the plan. Gemini's
 * hook `timeout` is in **milliseconds** (default 60000), so this is one hour.
 */
const afterAgentTimeoutMs = 3_600_000;

/** Single hook entry stored in `~/.gemini/settings.json` under an event. */
interface GeminiHook {
  type: "command";
  command: string;
  name?: string;
  timeout?: number;
}

/** Group of hooks scoped to an optional matcher. `AfterAgent` is not tool-scoped, so the matcher is omitted. */
interface GeminiHookGroup {
  matcher?: string;
  hooks: GeminiHook[];
}

/**
 * Shape of `~/.gemini/settings.json` as far as we care about it. Other top-level
 * keys ride along untouched via the index signature.
 */
interface GeminiConfig {
  hooks?: Record<string, GeminiHookGroup[]>;
  [key: string]: unknown;
}

const isSymbiotEntry = (command: string): boolean =>
  /apps\/gemini\/(src|dist)\/cli\.(ts|js).*run-hook/.test(command) ||
  command === "symbiot-gemini run-hook";

const cliCommand = (): string => {
  const here = fileURLToPath(import.meta.url);
  const srcCli = resolve(dirname(here), "cli.ts");
  return `bun ${srcCli} run-hook`;
};

const stripSymbiotEntries = (groups: GeminiHookGroup[]): GeminiHookGroup[] =>
  groups
    .map((g) => ({ ...g, hooks: g.hooks.filter((h) => !isSymbiotEntry(h.command)) }))
    .filter((g) => g.hooks.length > 0);

const ensureHook = (config: GeminiConfig, command: string): GeminiConfig => {
  const hooks = config.hooks ?? {};
  const existing = stripSymbiotEntries(hooks.AfterAgent ?? []);
  const symbiotGroup: GeminiHookGroup = {
    hooks: [{ type: "command", name: "symbiot-gemini", command, timeout: afterAgentTimeoutMs }],
  };
  return {
    ...config,
    hooks: {
      ...hooks,
      AfterAgent: [...existing, symbiotGroup],
    },
  };
};

const readConfig = async (): Promise<GeminiConfig> => {
  try {
    return JSON.parse(await readFile(settingsPath, "utf8")) as GeminiConfig;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
};

/**
 * Idempotently register the symbiot `AfterAgent` hook in
 * `~/.gemini/settings.json`. Strips any prior symbiot-gemini entries first, then
 * writes the current absolute-path command (pointing at source `cli.ts`, never
 * the bundle, so the embedded viewer's relative `dist/client/` path math stays
 * intact). Unrelated hooks and events are untouched. Writes only this file — the
 * Claude Code and Codex installers own their own configs and the three never
 * strip each other.
 */
export const installHook = async (): Promise<{ path: string; command: string }> => {
  const command = cliCommand();
  const current = await readConfig();
  const next = ensureHook(current, command);
  await mkdir(dirname(settingsPath), { recursive: true });
  await writeFile(settingsPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return { path: settingsPath, command };
};

const stripAllSymbiot = (config: GeminiConfig): { next: GeminiConfig; removed: number } => {
  const hooks = config.hooks ?? {};
  let removed = 0;
  const cleanedEntries = Object.entries(hooks).map(([event, groups]) => {
    const before = groups.flatMap((g) => g.hooks).length;
    const cleaned = stripSymbiotEntries(groups);
    removed += before - cleaned.flatMap((g) => g.hooks).length;
    return [event, cleaned] as const;
  });
  return {
    next: { ...config, hooks: Object.fromEntries(cleanedEntries) },
    removed,
  };
};

/**
 * Remove every symbiot-gemini hook entry from `~/.gemini/settings.json`,
 * regardless of which event it lives under. Other hooks are untouched.
 */
export const uninstallHook = async (): Promise<{ path: string; removed: number }> => {
  const current = await readConfig();
  const { next, removed } = stripAllSymbiot(current);
  if (removed === 0) return { path: settingsPath, removed };
  await writeFile(settingsPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return { path: settingsPath, removed };
};
