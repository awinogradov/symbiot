/**
 * Copilot CLI `agentStop` hook handler for `symbiot-copilot run-hook`.
 *
 * Copilot fires `agentStop` when the main agent finishes a turn, piping a JSON
 * payload on stdin. Unlike Codex (`last_assistant_message`) and Gemini
 * (`prompt_response`), Copilot's payload carries NO inline message — only a
 * `transcriptPath`. So we tail-read that transcript, extract the last assistant
 * message as the plan to review, spawn the viewer via {@link runPlanReview} (the
 * shared `@symbiot/agent-runtime` loop) under the `copilot` storage namespace,
 * block until the reviewer decides, then map the decision back to Copilot —
 * `{"decision":"block","reason"}` on request-changes (Copilot runs another turn
 * with `reason` as the prompt), or no output + exit 0 on approve.
 *
 * Copilot's `agentStop` has no `stop_hook_active` re-entrancy field, so a self-
 * managed marker (`~/.symbiot/hook-state/<sessionId>.json`, plan-hash + TTL)
 * breaks the block→retry→block loop when a turn re-emits an identical plan. Every
 * failure path degrades to a pass-through (no stdout, exit 0) so a stuck or
 * garbled hook never spuriously blocks Copilot.
 *
 * @example
 *   echo '{"sessionId":"s","transcriptPath":"/…/t.jsonl","stopReason":"end_turn"}' \
 *     | bun src/cli.ts run-hook --no-open
 *
 * @see ../README.md — the `## Schemas` section pins the stdin/decision shapes.
 * @see ../../../docs/agents/copilot-contract.md — the audited upstream contract.
 */
import { createHash } from "node:crypto";
import { mkdir, open, readFile, rename, writeFile, type FileHandle } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import { runPlanReview } from "@symbiot/agent-runtime";
import type { RunningServer } from "@symbiot/viewer";
// Bun's compile mode embeds this file into the binary; the import resolves to
// a `$bunfs/…` virtual path at runtime that fs APIs read transparently.
import viewerHtmlGz from "@symbiot/viewer/dist/client/index.html.gz" with { type: "file" };

/** The reviewer's decision, derived from the viewer boundary (matches `runPlanReview`). */
type ReviewDecision = Awaited<RunningServer["resolved"]>;

/**
 * The subset of Copilot's `agentStop` stdin payload this handler reads (camelCase
 * form, selected by the `agentStop` event name). Copilot also sends `timestamp`
 * and `cwd`, which ride along ignored. Fields are optional here only because the
 * parser is defensive against malformed input.
 *
 * @example
 *   { "sessionId": "abc", "transcriptPath": "/…/transcript.jsonl", "stopReason": "end_turn" }
 */
export interface CopilotAgentStopInput {
  sessionId?: string;
  transcriptPath?: string;
  stopReason?: string;
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * Validate a parsed stdin payload as a genuine `agentStop` turn-end event, or
 * return `null` to pass through. Pure — gates on `stopReason === "end_turn"` and a
 * usable `transcriptPath`. Does NOT read the transcript (that is async I/O). A
 * missing `sessionId` degrades to `""` (the re-entrancy guard is then a no-op).
 */
export const parseAgentStop = (input: unknown): Required<CopilotAgentStopInput> | null => {
  if (!isObject(input)) return null;
  const { sessionId, transcriptPath, stopReason } = input as CopilotAgentStopInput;
  if (stopReason !== "end_turn") return null;
  if (!isNonEmptyString(transcriptPath)) return null;
  return { sessionId: isNonEmptyString(sessionId) ? sessionId : "", transcriptPath, stopReason };
};

interface TranscriptTextBlock {
  text?: unknown;
}
interface TranscriptEntry {
  type?: string;
  role?: string;
  message?: { role?: string; content?: unknown };
  content?: unknown;
}

const blocksToText = (content: unknown): string | null => {
  if (typeof content === "string") return content.length > 0 ? content : null;
  if (!Array.isArray(content)) return null;
  const text = content
    .map((block: TranscriptTextBlock) => (typeof block?.text === "string" ? block.text : ""))
    .join("");
  return text.length > 0 ? text : null;
};

const entryRole = (entry: TranscriptEntry): string | undefined =>
  entry.message?.role ?? entry.role ?? entry.type;

const entryContent = (entry: TranscriptEntry): unknown => entry.message?.content ?? entry.content;

const assistantText = (entry: TranscriptEntry): string | null =>
  entryRole(entry) === "assistant" ? blocksToText(entryContent(entry)) : null;

const parseJsonl = (line: string): TranscriptEntry | null => {
  try {
    return JSON.parse(line) as TranscriptEntry;
  } catch {
    return null;
  }
};

/**
 * Extract the last assistant message from a Copilot transcript, or `null`.
 *
 * Copilot's transcript format is undocumented upstream (see `copilot-contract.md`);
 * we parse it as Claude/VSCode-compatible JSONL — one JSON object per line, the
 * assistant turn carrying either a `content` string or an array of
 * `{ type: "text", text }` blocks, at the top level or under `message`. Pure and
 * defensive: unparseable lines (e.g. a partial first line from the tail read) are
 * skipped, and any unrecognized shape is ignored, so a transcript with no readable
 * assistant message yields `null` and the caller passes through.
 */
export const extractLastAssistantMessage = (transcriptText: string): string | null => {
  let last: string | null = null;
  for (const line of transcriptText.split("\n")) {
    const entry = parseJsonl(line.trim());
    const text = entry === null ? null : assistantText(entry);
    if (text !== null) last = text;
  }
  return last;
};

const transcriptTailCapBytes = 262_144;

const readTail = async (handle: FileHandle): Promise<string | null> => {
  const { size } = await handle.stat();
  const start = size > transcriptTailCapBytes ? size - transcriptTailCapBytes : 0;
  const length = size - start;
  if (length === 0) return null;
  const buffer = Buffer.alloc(length);
  await handle.read(buffer, 0, length, start);
  return buffer.toString("utf8");
};

/**
 * Read the last {@link transcriptTailCapBytes} bytes of the transcript — only the
 * final assistant message matters, so a multi-MB transcript is never slurped whole
 * — or `null` on any I/O error (ENOENT/EACCES → pass-through).
 */
const readTranscriptTail = async (path: string): Promise<string | null> => {
  let handle: FileHandle | null = null;
  try {
    handle = await open(path, "r");
    return await readTail(handle);
  } catch {
    return null;
  } finally {
    await handle?.close();
  }
};

const hookStateDir = join(homedir(), ".symbiot", "hook-state");
const reentrancyTtlMs = 60_000;

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

/** Marker path for a session — the sessionId is hashed so it is always a safe filename. */
const markerPath = (sessionId: string): string => join(hookStateDir, `${sha256(sessionId)}.json`);

/**
 * True when this exact `(sessionId, plan)` was blocked within the TTL — i.e. the
 * block we emitted triggered a retry turn that re-emitted a byte-identical plan,
 * which would otherwise re-gate forever. Best-effort: any read error returns
 * `false` (proceed) so a guard I/O failure never suppresses a real review.
 */
export const isReentrant = async (sessionId: string, plan: string): Promise<boolean> => {
  if (sessionId.length === 0) return false;
  try {
    const marker = JSON.parse(await readFile(markerPath(sessionId), "utf8")) as {
      planHash?: unknown;
      ts?: unknown;
    };
    return (
      marker.planHash === sha256(plan) &&
      typeof marker.ts === "number" &&
      Date.now() - marker.ts < reentrancyTtlMs
    );
  } catch {
    return false;
  }
};

/**
 * Record the marker for this `(sessionId, plan)` — written only when we are about
 * to block, so the TTL window is measured from the block (the retry fires within
 * seconds), not from a slow human review. Best-effort and atomic (tmp + rename); a
 * failed write fails open (the review still proceeds).
 */
export const recordMarker = async (sessionId: string, plan: string): Promise<void> => {
  if (sessionId.length === 0) return;
  try {
    await mkdir(hookStateDir, { recursive: true });
    const path = markerPath(sessionId);
    const tmp = `${path}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify({ planHash: sha256(plan), ts: Date.now() }), "utf8");
    await rename(tmp, path);
  } catch {
    // best-effort; proceed without a marker
  }
};

/** Write to stdout and await drain on backpressure, so the full decision JSON is
 * flushed before the process exits (a truncated `{"decision":"block"…` would be
 * read as a phantom block). */
const writeStdout = async (text: string): Promise<void> => {
  if (!process.stdout.write(text)) {
    await new Promise<void>((resolve) => process.stdout.once("drain", resolve));
  }
};

/**
 * Emit Copilot's request-changes decision. `decision:block` makes Copilot run
 * another turn with `reason` as the steering prompt. The full JSON is a single
 * buffered write, awaited before the caller returns. Mirrors `apps/codex` /
 * `apps/gemini` byte-for-byte, including the default reason.
 */
export const emitBlockDecision = async (feedback: string): Promise<void> => {
  const payload = {
    decision: "block",
    reason: feedback.length > 0 ? feedback : "Reviewer requested changes.",
  };
  await writeStdout(JSON.stringify(payload));
};

/**
 * Map a reviewer decision to Copilot's response and return the exit code.
 * `approve` writes nothing (Copilot lets the turn end); request-changes emits
 * `decision:block`. Exported so the round trip is unit-testable without a browser.
 */
export const emitDecision = async (decision: ReviewDecision): Promise<number> => {
  if (decision.kind === "approve") return 0;
  await emitBlockDecision(decision.feedback);
  return 0;
};

const flagValue = (argv: string[], flag: string): string | null => {
  const idx = argv.indexOf(flag);
  return idx >= 0 ? (argv[idx + 1] ?? null) : null;
};

const parsePort = (raw: string | null): number | null => {
  if (raw === null) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const readHookInput = async (): Promise<unknown> => {
  const chunks: Uint8Array[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Uint8Array);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    // Malformed payload → pass through (return {} → parseAgentStop null → exit 0).
    return {};
  }
};

/**
 * Read stdin and resolve the reviewable `(sessionId, plan)` for a genuine
 * `agentStop` turn, or `null` to pass through (non-event, unreadable transcript,
 * or no assistant message in the transcript).
 */
const reviewableFromStdin = async (): Promise<{ sessionId: string; plan: string } | null> => {
  const event = parseAgentStop(await readHookInput());
  if (event === null) return null;
  const transcript = await readTranscriptTail(event.transcriptPath);
  if (transcript === null) return null;
  const plan = extractLastAssistantMessage(transcript);
  return plan === null ? null : { sessionId: event.sessionId, plan };
};

/**
 * `symbiot-copilot run-hook` entry point. Reads the Copilot `agentStop` payload
 * from stdin, extracts the plan from the referenced transcript, and — when the
 * review is not a re-entrant retry — drives the viewer and emits the Copilot
 * decision. Returns the process exit code. Every failure path returns 0 with no
 * stdout (a spurious block would derail Copilot's turn).
 *
 * `argv` is the post-command tail. Production Copilot passes none → OS-assigned
 * port, browser opens. The optional `--port` / `--no-open` flags mirror
 * `apps/viewer/src/bin.ts` for the headless E2E harness.
 */
export const runHook = async (argv: string[]): Promise<number> => {
  try {
    const reviewable = await reviewableFromStdin();
    if (reviewable === null) return 0;
    const { sessionId, plan } = reviewable;
    if (await isReentrant(sessionId, plan)) return 0;

    const port = parsePort(flagValue(argv, "--port"));
    const noOpen = argv.includes("--no-open");
    return await runPlanReview({
      plan,
      serverOptions: {
        indexHtmlGz: viewerHtmlGz,
        agentId: "copilot",
        port,
        openInBrowser: !noOpen,
      },
      onStart: (url) => process.stderr.write(`symbiot-copilot: review plan at ${url}\n`),
      onResolved: async (decision) => {
        // Mark before blocking so the retry turn's identical re-emission is caught.
        if (decision.kind !== "approve") await recordMarker(sessionId, plan);
        return emitDecision(decision);
      },
    });
  } catch {
    // Fail open: an unexpected error must never become a spurious block on agentStop.
    return 0;
  }
};
