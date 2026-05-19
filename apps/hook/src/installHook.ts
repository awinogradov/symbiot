import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const settingsPath = join(homedir(), ".claude", "settings.json");

interface ClaudeHook {
  type: "command";
  command: string;
}

interface ClaudeHookGroup {
  matcher?: string;
  hooks: ClaudeHook[];
}

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
  return {
    ...settings,
    hooks: {
      ...hooks,
      Stop: existing,
      PreToolUse: [
        ...preExisting,
        { matcher: "ExitPlanMode", hooks: [{ type: "command", command }] },
      ],
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
 * Idempotently register the symbiot PreToolUse(ExitPlanMode) hook in
 * ~/.claude/settings.json. Strips any prior symbiot entries (including the
 * deprecated Stop registration shipped in the first Phase 2 cut), then writes
 * the current absolute-path command. Other hooks in the file are untouched.
 */
export const installHook = async (): Promise<{
  updated: boolean;
  path: string;
  command: string;
}> => {
  const command = cliCommand();
  const current = await readSettings();
  const next = ensureHook(current, command);
  await mkdir(dirname(settingsPath), { recursive: true });
  await writeFile(settingsPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return { updated: true, path: settingsPath, command };
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
