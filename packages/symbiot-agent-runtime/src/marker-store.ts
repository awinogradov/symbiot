/**
 * A small TTL marker store for hook re-entrancy guards.
 *
 * Two agents need to remember "I just gated this exact plan" across hook
 * invocations: Claude Code (the PreToolUse run leaves a marker the
 * PermissionRequest run reads) and Copilot (a block triggers a retry turn that
 * re-emits an identical plan, which must not re-gate forever). Both store a
 * `(hash, timestamp)` pair under `~/.symbiot/hook-state/` and treat a marker as
 * fresh only within a TTL. {@link createMarkerStore} owns that logic; callers
 * supply the directory, TTL, and key→filename mapping.
 *
 * Every operation is best-effort: a read error means "not fresh" (proceed with
 * the review) and a write error is swallowed (fail open), so a state-file I/O
 * failure never suppresses a real review.
 *
 * @example
 * ```ts
 * import { createMarkerStore } from "@symbiot/agent-runtime/marker-store";
 * const store = createMarkerStore({ dir, ttlMs: 60_000 });
 * if (await store.isFresh(sessionId, plan)) return 0; // re-entrant, skip
 * await store.record(sessionId, plan);                // before blocking
 * ```
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { writeAtomic } from "./managed-file.ts";

/** Hex SHA-256 of `value` — the shared hash for marker payloads, filenames, and plan fingerprints. */
export const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

/** A marker store bound to a directory + TTL. */
export interface MarkerStore {
  /** True when `key`'s marker holds `sha256(payload)` and is younger than the TTL. */
  isFresh: (key: string, payload: string) => Promise<boolean>;
  /** Record `key`'s marker as `sha256(payload)` stamped now. Best-effort, atomic. */
  record: (key: string, payload: string) => Promise<void>;
}

/** Options for {@link createMarkerStore}. */
export interface CreateMarkerStoreOptions {
  /** Directory the marker files live under (e.g. `~/.symbiot/hook-state`). */
  dir: string;
  /** Freshness window in milliseconds. */
  ttlMs: number;
  /** Map a key to a filename. Defaults to `${sha256(key)}.json` so any key is a safe filename. */
  fileName?: (key: string) => string;
  /** Injection seam for tests; defaults to `Date.now`. */
  now?: () => number;
}

export const createMarkerStore = ({
  dir,
  ttlMs,
  fileName = (key) => `${sha256(key)}.json`,
  now = () => Date.now(),
}: CreateMarkerStoreOptions): MarkerStore => {
  const pathFor = (key: string): string => join(dir, fileName(key));
  // A marker is fresh when its hash matches and its age is within [0, ttl). The
  // non-negative bound rejects future-dated markers (clock skew / tampering) so
  // they can never suppress a review.
  const isMarkerFresh = (marker: { hash?: unknown; ts?: unknown }, payload: string): boolean => {
    if (marker.hash !== sha256(payload) || typeof marker.ts !== "number") return false;
    const age = now() - marker.ts;
    return age >= 0 && age < ttlMs;
  };
  return {
    isFresh: async (key, payload) => {
      try {
        const marker = JSON.parse(await readFile(pathFor(key), "utf8")) as {
          hash?: unknown;
          ts?: unknown;
        };
        return isMarkerFresh(marker, payload);
      } catch {
        return false;
      }
    },
    record: async (key, payload) => {
      try {
        await writeAtomic(pathFor(key), JSON.stringify({ hash: sha256(payload), ts: now() }));
      } catch {
        // best-effort; proceed without a marker
      }
    },
  };
};
