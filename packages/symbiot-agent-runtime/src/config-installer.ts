/**
 * Factory for the "merge into a shared JSON settings file" hook installer used by
 * Codex (`~/.codex/hooks.json`), Gemini (`~/.gemini/settings.json`), and Claude
 * Code (`~/.claude/settings.json`).
 *
 * All three read-modify-write a host config file that uses the same
 * `hooks: { <event>: [{ matcher?, hooks: [{ type, command, … }] }] }` shape.
 * They differ only in data: the file path, which event(s) the symbiot group is
 * registered under, an optional tool `matcher`, optional events to strip-clean
 * without registering (Claude Code's legacy `Stop`), and the per-entry extras
 * (`name`, `timeout` — Codex seconds vs. Gemini milliseconds). {@link createConfigHookInstaller}
 * captures the shared algorithm; the divergences are parameters.
 *
 * Install is idempotent (prior symbiot entries are stripped first). Uninstall
 * removes every symbiot entry across all events. The `command` points at the
 * app's source `cli.ts` (supplied via `cliCommand`, which the app builds from its
 * own `import.meta.url` so the path resolves to the app, not this package).
 *
 * @example
 * ```ts
 * export const { installHook, uninstallHook } = createConfigHookInstaller({
 *   path: join(homedir(), ".codex", "hooks.json"),
 *   cliCommand,
 *   isSymbiotEntry: (c) => /apps\/codex\/(src|dist)\/cli\.(ts|js).*run-hook/.test(c) || c === "symbiot-codex run-hook",
 *   registerEvents: ["Stop"],
 *   entryExtras: { timeout: 3600 },
 * });
 * ```
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

/** Per-entry extras that ride alongside `type`/`command` in a hook entry. */
export interface HookEntryExtras {
  /** Optional display name (Gemini sets `symbiot-gemini`). */
  name?: string;
  /** Optional timeout — Codex/Claude use seconds, Gemini milliseconds. Omitted entirely when absent. */
  timeout?: number;
  /**
   * Optional spinner message shown to the user while the hook runs. Claude Code
   * renders this `statusMessage` field today; Codex/Gemini/Copilot share the same
   * config shape, so it is additive and forward-compatible (ignored until they
   * render it). Omitted entirely when absent.
   */
  statusMessage?: string;
}

/** Options for {@link createConfigHookInstaller}. */
export interface ConfigHookInstallerOptions {
  /** Absolute path to the host's settings/hooks JSON file. */
  path: string;
  /** Builds the absolute-path `… run-hook` command. The app supplies this from its own `import.meta.url`. */
  cliCommand: () => string;
  /** Recognizes a command string as a symbiot-owned entry (for strip/uninstall). */
  isSymbiotEntry: (command: string) => boolean;
  /** Events to register the symbiot group under (e.g. `["Stop"]`, `["PreToolUse", "PermissionRequest"]`). */
  registerEvents: string[];
  /** Events to strip symbiot entries from without registering (e.g. Claude Code's legacy `["Stop"]`). */
  cleanEvents?: string[];
  /** Optional tool matcher scoping the group (e.g. `ExitPlanMode`). Omitted when absent. */
  matcher?: string;
  /** Per-entry extras (`name`, `timeout`). */
  entryExtras?: HookEntryExtras;
}

interface HookEntry {
  type: "command";
  command: string;
  name?: string;
  timeout?: number;
  statusMessage?: string;
}

interface HookGroup {
  matcher?: string;
  hooks: HookEntry[];
}

interface HookConfig {
  hooks?: Record<string, HookGroup[]>;
  [key: string]: unknown;
}

/** Install / uninstall a config-merge hook. */
export interface ConfigHookInstaller {
  installHook: () => Promise<{ path: string; command: string }>;
  uninstallHook: () => Promise<{ path: string; removed: number }>;
}

export const createConfigHookInstaller = ({
  path,
  cliCommand,
  isSymbiotEntry,
  registerEvents,
  cleanEvents = [],
  matcher,
  entryExtras = {},
}: ConfigHookInstallerOptions): ConfigHookInstaller => {
  const stripSymbiotEntries = (groups: HookGroup[]): HookGroup[] =>
    groups
      .map((g) => ({ ...g, hooks: g.hooks.filter((h) => !isSymbiotEntry(h.command)) }))
      .filter((g) => g.hooks.length > 0);

  const buildGroup = (command: string): HookGroup => {
    const { name, timeout, statusMessage } = entryExtras;
    const entry: HookEntry = {
      type: "command",
      ...(name !== undefined ? { name } : {}),
      command,
      ...(timeout !== undefined ? { timeout } : {}),
      ...(statusMessage !== undefined ? { statusMessage } : {}),
    };
    return { ...(matcher !== undefined ? { matcher } : {}), hooks: [entry] };
  };

  const ensureHook = (config: HookConfig, command: string): HookConfig => {
    const hooks = config.hooks ?? {};
    const groupsFor = (event: string): HookGroup[] => hooks[event] ?? [];
    const nextHooks: Record<string, HookGroup[]> = { ...hooks };
    for (const event of cleanEvents) nextHooks[event] = stripSymbiotEntries(groupsFor(event));
    for (const event of registerEvents) {
      nextHooks[event] = [...stripSymbiotEntries(groupsFor(event)), buildGroup(command)];
    }
    return { ...config, hooks: nextHooks };
  };

  const readConfig = async (): Promise<HookConfig> => {
    try {
      return JSON.parse(await readFile(path, "utf8")) as HookConfig;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
      throw error;
    }
  };

  const installHook = async (): Promise<{ path: string; command: string }> => {
    const command = cliCommand();
    const next = ensureHook(await readConfig(), command);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    return { path, command };
  };

  const stripAllSymbiot = (config: HookConfig): { next: HookConfig; removed: number } => {
    const hooks = config.hooks ?? {};
    let removed = 0;
    const cleanedEntries = Object.entries(hooks).map(([event, groups]) => {
      const before = groups.flatMap((g) => g.hooks).length;
      const cleaned = stripSymbiotEntries(groups);
      removed += before - cleaned.flatMap((g) => g.hooks).length;
      return [event, cleaned] as const;
    });
    return { next: { ...config, hooks: Object.fromEntries(cleanedEntries) }, removed };
  };

  const uninstallHook = async (): Promise<{ path: string; removed: number }> => {
    const { next, removed } = stripAllSymbiot(await readConfig());
    if (removed === 0) return { path, removed };
    await writeFile(path, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    return { path, removed };
  };

  return { installHook, uninstallHook };
};
