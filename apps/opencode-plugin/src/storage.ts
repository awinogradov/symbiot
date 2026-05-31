/**
 * On-disk state for the OpenCode plugin, namespaced under
 * `~/.symbiot/agents/opencode/` (the per-agent layout from issue #64).
 *
 * Two net-new subtrees the viewer does not manage:
 *  - `inbox/<sessionID>.md`   — the assistant response saved for review on `session.idle`.
 *  - `pending/<sessionID>.json` — the reviewer's feedback waiting to be injected into the
 *    next turn. Written when the reviewer requests changes; **claimed** (consumed once)
 *    by the `chat.message` hook.
 *
 * The viewer does not export its `getStorageRoot`, so the base path is recomputed here
 * from `process.env.HOME` per call — identical to `apps/viewer/src/server/storage.ts`, so
 * tests redirect both by mutating `HOME`.
 *
 * @example
 *   await writeInbox(sessionId, response);
 *   await writePendingFeedback(sessionId, "expand the test plan");
 *   const feedback = await claimPendingFeedback(sessionId); // consume-once
 */
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

import { z } from "zod";

/** Persisted reviewer feedback. Validated on read — never trust the on-disk shape. */
const pendingSchema = z.object({ feedback: z.string(), at: z.number() });

/** A session id is interpolated into a filename, so it must be a single safe path segment. */
const sessionIdRe = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

const assertValidSessionId = (sessionId: string): void => {
  if (!sessionIdRe.test(sessionId)) {
    throw new Error(`invalid sessionId: ${JSON.stringify(sessionId)}`);
  }
};

/**
 * Base directory for OpenCode plugin state. Recomputed per call from
 * `process.env.HOME` (not cached) so tests can redirect to a tmpdir.
 */
export const getStorageDir = (): string =>
  join(process.env.HOME || homedir(), ".symbiot", "agents", "opencode");

/** Absolute path of the inbox file holding the response under review for a session. */
export const inboxPath = (sessionId: string): string => {
  assertValidSessionId(sessionId);
  return join(getStorageDir(), "inbox", `${sessionId}.md`);
};

/** Absolute path of the pending-feedback file awaiting injection for a session. */
export const pendingPath = (sessionId: string): string => {
  assertValidSessionId(sessionId);
  return join(getStorageDir(), "pending", `${sessionId}.json`);
};

/** Write to a temp sibling then rename, so a crash never leaves a half-written file. */
const writeAtomic = async (target: string, contents: string): Promise<void> => {
  await mkdir(dirname(target), { recursive: true });
  const tmp = `${target}.${randomUUID()}.tmp`;
  await writeFile(tmp, contents, "utf8");
  await rename(tmp, target);
};

/** Persist the assistant response under review for a session (atomic). */
export const writeInbox = async (sessionId: string, markdown: string): Promise<void> => {
  await writeAtomic(inboxPath(sessionId), markdown);
};

/** Persist reviewer feedback to be injected into the session's next turn (atomic). */
export const writePendingFeedback = async (sessionId: string, feedback: string): Promise<void> => {
  await writeAtomic(pendingPath(sessionId), `${JSON.stringify({ feedback, at: Date.now() })}\n`);
};

/**
 * Atomically claim and consume the pending feedback for a session, returning the
 * feedback text or `null` when there is none. The claim renames the file to a
 * unique sibling first, so concurrent `chat.message` invocations cannot both read
 * it — the loser sees `ENOENT` and returns `null` (no double-injection). The
 * claimed temp file is always removed.
 */
export const claimPendingFeedback = async (sessionId: string): Promise<string | null> => {
  const src = pendingPath(sessionId);
  const claim = `${src}.${randomUUID()}.claim`;
  try {
    await rename(src, claim);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  try {
    const parsed = pendingSchema.parse(JSON.parse(await readFile(claim, "utf8")));
    return parsed.feedback;
  } finally {
    await rm(claim, { force: true });
  }
};
