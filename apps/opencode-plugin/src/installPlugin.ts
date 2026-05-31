/**
 * Install / uninstall the symbiot OpenCode plugin by writing a loader at
 * `~/.config/opencode/plugins/symbiot-opencode.ts`.
 *
 * OpenCode auto-loads every file in its plugins directory and registers the
 * `Plugin`-shaped exports it finds. symbiot owns one dedicated loader file that
 * re-exports {@link SymbiotOpenCodePlugin} from this workspace's **source**
 * `plugin.ts` (never a bundle) so the plugin's relative imports — `@symbiot/viewer`
 * and the embedded `dist/client/` viewer bundle — keep resolving from the repo's
 * `node_modules`. A `@managed-by` sentinel guards uninstall so a hand-edited file
 * is never blind-deleted.
 *
 * The base path is resolved from `process.env.HOME` (not `os.homedir()`, which Bun
 * captures once at startup) so tests redirect by mutating `HOME` — mirrors
 * `apps/viewer/src/server/storage.ts`.
 *
 * @example
 *   const { path, source } = await installPlugin();
 *   // path === "~/.config/opencode/plugins/symbiot-opencode.ts"
 *
 * @see ./README.md — the manual `opencode.json` alternative.
 */
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

/** Atomic write — tmp sibling + `rename`, so a crash never leaves a half-written file. */
const writeAtomic = async (path: string, contents: string): Promise<void> => {
  const tmp = `${path}.${process.pid}.tmp`;
  await writeFile(tmp, contents, "utf8");
  await rename(tmp, path);
};

/**
 * Idempotently register the symbiot plugin loader. Re-running produces a
 * byte-identical file. symbiot owns this file outright — sibling plugin files in
 * the directory are untouched.
 */
export const installPlugin = async (): Promise<{ path: string; source: string }> => {
  const source = pluginSourcePath();
  await mkdir(pluginsDir(), { recursive: true });
  await writeAtomic(loaderPath(), buildLoader(source));
  return { path: loaderPath(), source };
};

const readOwnership = async (): Promise<"ours" | "foreign" | "absent"> => {
  let raw: string;
  try {
    raw = await readFile(loaderPath(), "utf8");
  } catch (error) {
    const { code } = error as NodeJS.ErrnoException;
    if (code === "ENOENT" || code === "ENOTDIR") return "absent";
    throw error;
  }
  return raw.includes(managedMarker) ? "ours" : "foreign";
};

/**
 * Remove symbiot's loader from the OpenCode plugins directory. Deletes it only
 * when it still carries the `@managed-by` sentinel; a hand-edited file is left in
 * place (reported as `removed: 0`, with a warning) so user content is never
 * destroyed. `removed` is `1` when the loader was deleted, else `0`.
 */
export const uninstallPlugin = async (): Promise<{ path: string; removed: number }> => {
  const ownership = await readOwnership();
  if (ownership === "foreign") {
    process.stderr.write(
      `symbiot-opencode: ${loaderPath()} was modified by hand (no symbiot marker); leaving it untouched\n`
    );
  }
  if (ownership !== "ours") return { path: loaderPath(), removed: 0 };
  await unlink(loaderPath());
  return { path: loaderPath(), removed: 1 };
};
