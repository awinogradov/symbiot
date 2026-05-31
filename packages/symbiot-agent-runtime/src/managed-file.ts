/**
 * Primitives for a symbiot-owned config file: atomic writes plus an ownership
 * sentinel so uninstall never blind-deletes a file a user hand-edited.
 *
 * Shared by the dedicated-file installers (Copilot's `~/.copilot/hooks/…json`,
 * OpenCode's plugin loader) and the {@link createMarkerStore} state files. The
 * ownership predicate is supplied by the caller because each file format carries
 * its sentinel differently (a JSON field vs. a `@managed-by` comment).
 *
 * @example
 * ```ts
 * import { writeAtomic, removeIfOwned } from "@symbiot/agent-runtime/managed-file";
 * await writeAtomic(path, contents);
 * const removed = await removeIfOwned(path, (raw) => raw.includes(marker));
 * ```
 */
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

/** Whether the on-disk file at `path` is owned by symbiot, foreign, or missing. */
export type Ownership = "ours" | "foreign" | "absent";

const isMissing = (error: unknown): boolean => {
  const { code } = error as NodeJS.ErrnoException;
  return code === "ENOENT" || code === "ENOTDIR";
};

/** Delete `path`, treating an already-absent file (concurrent delete) as success. */
const safeUnlink = async (path: string): Promise<void> => {
  try {
    await unlink(path);
  } catch (error) {
    if (!isMissing(error)) throw error;
  }
};

/**
 * Atomic write — create the parent dir, write a per-write-unique tmp sibling,
 * then `rename` over the target, so a crash never leaves a half-written file.
 * The tmp name carries a random suffix so two concurrent writes to the same path
 * in one process can never collide.
 */
export const writeAtomic = async (path: string, contents: string): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(tmp, contents, "utf8");
  await rename(tmp, path);
};

/**
 * Classify ownership of `path`. Missing-path errors (`ENOENT`/`ENOTDIR`) resolve
 * to `absent`; any other read error propagates. `isOwned` inspects the raw file
 * contents for the caller's sentinel.
 */
export const readOwnership = async (
  path: string,
  isOwned: (raw: string) => boolean
): Promise<Ownership> => {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    if (isMissing(error)) return "absent";
    throw error;
  }
  return isOwned(raw) ? "ours" : "foreign";
};

/**
 * Delete `path` only when it still carries symbiot's sentinel. A foreign file is
 * left in place (and `onForeign` is invoked, e.g. to warn) so user content is
 * never destroyed. Returns `1` when the file was deleted, else `0`.
 */
export const removeIfOwned = async (
  path: string,
  isOwned: (raw: string) => boolean,
  onForeign?: () => void
): Promise<number> => {
  const ownership = await readOwnership(path, isOwned);
  if (ownership === "foreign") onForeign?.();
  if (ownership !== "ours") return 0;
  await safeUnlink(path);
  return 1;
};
