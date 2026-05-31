/**
 * Install / uninstall the symbiot OpenCode plugin by writing a loader at
 * `~/.config/opencode/plugins/symbiot-opencode.ts`.
 *
 * OpenCode auto-loads every file in its plugins directory and registers the
 * `Plugin`-shaped exports it finds. symbiot owns one dedicated loader file that
 * re-exports {@link SymbiotOpenCodePlugin} from this workspace's **source**
 * `plugin.ts` (never a bundle) so the plugin's relative imports keep resolving
 * from the repo's `node_modules`. Built on the shared {@link writeAtomic} /
 * {@link removeIfOwned} primitives; a `@managed-by` sentinel guards uninstall so a
 * hand-edited file is never blind-deleted.
 *
 * The base path is resolved from `process.env.HOME` (not `os.homedir()`, which Bun
 * captures once at startup) so tests redirect by mutating `HOME`.
 *
 * @example
 *   const { path, source } = await installPlugin();
 *   // path === "~/.config/opencode/plugins/symbiot-opencode.ts"
 *
 * @see ./README.md — the manual `opencode.json` alternative.
 */
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { removeIfOwned, writeAtomic } from "@symbiot/agent-runtime/managed-file";

/** Ownership sentinel — `uninstall` only deletes a loader still carrying it. */
const managedMarker = "@managed-by symbiot-opencode";

const pluginsDir = (): string =>
  join(process.env.HOME || homedir(), ".config", "opencode", "plugins");
const loaderPath = (): string => join(pluginsDir(), "symbiot-opencode.ts");

/** Absolute path to this workspace's source plugin entry (sibling of this file). */
const pluginSourcePath = (): string =>
  resolve(dirname(fileURLToPath(import.meta.url)), "plugin.ts");

const buildLoader = (source: string): string =>
  `// ${managedMarker} — generated loader; remove via \`symbiot-opencode uninstall\`.\n` +
  `export { SymbiotOpenCodePlugin } from ${JSON.stringify(source)};\n`;

/**
 * Idempotently register the symbiot plugin loader. Re-running produces a
 * byte-identical file. symbiot owns this file outright — sibling plugin files in
 * the directory are untouched.
 */
export const installPlugin = async (): Promise<{ path: string; source: string }> => {
  const source = pluginSourcePath();
  await writeAtomic(loaderPath(), buildLoader(source));
  return { path: loaderPath(), source };
};

/**
 * Remove symbiot's loader from the OpenCode plugins directory. Deletes it only
 * when it still carries the `@managed-by` sentinel; a hand-edited file is left in
 * place (reported as `removed: 0`, with a warning) so user content is never
 * destroyed.
 */
export const uninstallPlugin = async (): Promise<{ path: string; removed: number }> => {
  const path = loaderPath();
  const removed = await removeIfOwned(
    path,
    (raw) => raw.includes(managedMarker),
    () =>
      process.stderr.write(
        `symbiot-opencode: ${path} was modified by hand (no symbiot marker); leaving it untouched\n`
      )
  );
  return { path, removed };
};
