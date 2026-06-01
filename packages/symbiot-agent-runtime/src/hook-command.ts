/**
 * Resolve the `… run-hook` command string an installer writes into a host's hook
 * config (Codex `~/.codex/hooks.json`, Gemini `~/.gemini/settings.json`, Copilot
 * `~/.copilot/hooks/…`). The command differs by how symbiot is running:
 *
 * - **Compiled binary** (shipped via `scripts/install.sh` to `~/.local/bin`): Bun
 *   embeds the app's sources under a `$bunfs`/`~BUN` virtual path, so the caller's
 *   `import.meta.url` carries that marker. Return the bare `"<binName> run-hook"`
 *   — the installer puts the binary on `PATH`, the host resolves it there, and the
 *   per-agent `isSymbiotEntry` matchers already recognize this exact form.
 * - **Source / dev** (`bun --filter @symbiot/<agent> install-hook`): resolve the
 *   sibling `cli.ts` from `import.meta.url` and return
 *   `"bun <abs>/cli.ts run-hook"` (today's behaviour), so the embedded viewer's
 *   relative `dist/client/` path math stays intact.
 *
 * @example
 *   const cliCommand = (): string =>
 *     resolveHookCommand({ importMetaUrl: import.meta.url, binName: "symbiot-codex" });
 */
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Options for {@link resolveHookCommand}. */
export interface ResolveHookCommandOptions {
  /** The calling module's `import.meta.url`. Used to resolve the sibling `cli.ts` in dev. */
  importMetaUrl: string;
  /** The compiled binary's name on `PATH` (e.g. `symbiot-codex`). */
  binName: string;
}

/**
 * True when running inside a Bun standalone binary.
 *
 * Two independent signals, because Bun is inconsistent: the **entry** module's
 * `import.meta.url` carries a `$bunfs`/`~BUN` marker, but an **imported** module
 * (like each app's `installHook.ts`) keeps its original on-disk path. So the
 * authoritative signal is `process.execPath`: in dev it is the `bun`/`node`
 * runtime; in a compiled binary it is the standalone executable itself.
 */
const isCompiledBinary = (importMetaUrl: string): boolean => {
  if (importMetaUrl.includes("$bunfs") || importMetaUrl.includes("~BUN")) return true;
  const exe = basename(process.execPath)
    .toLowerCase()
    .replace(/\.exe$/, "");
  return exe !== "bun" && exe !== "node";
};

export const resolveHookCommand = ({
  importMetaUrl,
  binName,
}: ResolveHookCommandOptions): string =>
  isCompiledBinary(importMetaUrl)
    ? `${binName} run-hook`
    : `bun ${JSON.stringify(resolve(dirname(fileURLToPath(importMetaUrl)), "cli.ts"))} run-hook`;
