/**
 * Install / uninstall the symbiot Codex hook in `~/.codex/hooks.json`.
 *
 * Codex CLI's hook file uses the same JSON shape as Claude Code's
 * `settings.json` hooks, so this mirrors `apps/hook/src/installHook.ts` — only
 * the target file (`~/.codex/hooks.json`), the event (`Stop`, not tool-scoped),
 * and the entry matcher differ. Codex honors `{"decision":"block","reason"}`
 * directly on `Stop`, so there is no `PermissionRequest` companion entry.
 *
 * @example
 *   const { path, command } = await installHook();
 *   // path === "~/.codex/hooks.json", command === "bun /…/cli.ts run-hook"
 *
 * @see ../../README.md — the `## Schemas` section pins the on-disk shape.
 * @see ../../../hook/src/installHook.ts — the Claude Code counterpart.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const hooksPath = join(homedir(), ".codex", "hooks.json");

/** A long timeout (seconds) — `run-hook` blocks while a human reviews the plan. */
const stopTimeoutSeconds = 3600;

/** Single hook entry stored in `~/.codex/hooks.json` under an event. */
interface CodexHook {
  type: "command";
  command: string;
  timeout?: number;
}

/** Group of hooks scoped to an optional matcher. `Stop` is not tool-scoped, so the matcher is omitted. */
interface CodexHookGroup {
  matcher?: string;
  hooks: CodexHook[];
}

/**
 * Shape of `~/.codex/hooks.json` as far as we care about it. Other top-level
 * keys ride along untouched via the index signature.
 */
interface CodexConfig {
  hooks?: Record<string, CodexHookGroup[]>;
  [key: string]: unknown;
}

const isSymbiotEntry = (command: string): boolean =>
  /apps\/codex\/(src|dist)\/cli\.(ts|js).*run-hook/.test(command) ||
  command === "symbiot-codex run-hook";

const cliCommand = (): string => {
  const here = fileURLToPath(import.meta.url);
  const srcCli = resolve(dirname(here), "cli.ts");
  return `bun ${srcCli} run-hook`;
};

const stripSymbiotEntries = (groups: CodexHookGroup[]): CodexHookGroup[] =>
  groups
    .map((g) => ({ ...g, hooks: g.hooks.filter((h) => !isSymbiotEntry(h.command)) }))
    .filter((g) => g.hooks.length > 0);

const ensureHook = (config: CodexConfig, command: string): CodexConfig => {
  const hooks = config.hooks ?? {};
  const existing = stripSymbiotEntries(hooks.Stop ?? []);
  const symbiotGroup: CodexHookGroup = {
    hooks: [{ type: "command", command, timeout: stopTimeoutSeconds }],
  };
  return {
    ...config,
    hooks: {
      ...hooks,
      Stop: [...existing, symbiotGroup],
    },
  };
};

const readConfig = async (): Promise<CodexConfig> => {
  try {
    return JSON.parse(await readFile(hooksPath, "utf8")) as CodexConfig;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
};

/**
 * Idempotently register the symbiot `Stop` hook in `~/.codex/hooks.json`. Strips
 * any prior symbiot-codex entries first, then writes the current absolute-path
 * command (pointing at source `cli.ts`, never the bundle, so the embedded
 * viewer's relative `dist/client/` path math stays intact). Unrelated hooks and
 * events are untouched. Writes only this file — the Claude Code installer owns
 * `~/.claude/settings.json` and the two never strip each other.
 */
export const installHook = async (): Promise<{ path: string; command: string }> => {
  const command = cliCommand();
  const current = await readConfig();
  const next = ensureHook(current, command);
  await mkdir(dirname(hooksPath), { recursive: true });
  await writeFile(hooksPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return { path: hooksPath, command };
};

const stripAllSymbiot = (config: CodexConfig): { next: CodexConfig; removed: number } => {
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
 * Remove every symbiot-codex hook entry from `~/.codex/hooks.json`, regardless
 * of which event it lives under. Other hooks are untouched.
 */
export const uninstallHook = async (): Promise<{ path: string; removed: number }> => {
  const current = await readConfig();
  const { next, removed } = stripAllSymbiot(current);
  if (removed === 0) return { path: hooksPath, removed };
  await writeFile(hooksPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return { path: hooksPath, removed };
};
