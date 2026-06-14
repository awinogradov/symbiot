/**
 * Copilot CLI `agentStop` hook handler for `symbiot-copilot run-hook`.
 *
 * Copilot fires `agentStop` when the main agent finishes a turn, piping a JSON
 * payload on stdin. Unlike Codex (`last_assistant_message`) and Gemini
 * (`prompt_response`), Copilot's payload carries NO inline message — only a
 * `transcriptPath`. So we tail-read that transcript, extract the last assistant
 * message as the plan to review, spawn the viewer via the shared
 * {@link runPlanReview} loop under the `copilot` storage namespace, block until
 * the reviewer decides, then map the decision back via the shared
 * {@link emitDecision} — `{"decision":"block","reason"}` on request-changes
 * (Copilot runs another turn with `reason` as the prompt), or no output + exit 0
 * on approve.
 *
 * Copilot's `agentStop` has no `stop_hook_active` re-entrancy field, so the shared
 * {@link createMarkerStore} (`~/.symbiot/hook-state/<sha256(sessionId)>.json`,
 * plan-hash + TTL) breaks the block→retry→block loop when a turn re-emits an
 * identical plan. Every failure path degrades to a pass-through (no stdout, exit
 * 0) so a stuck or garbled hook never spuriously blocks Copilot.
 *
 * @example
 *   echo '{"sessionId":"s","transcriptPath":"/…/t.jsonl","stopReason":"end_turn"}' \
 *     | bun src/cli.ts run-hook --no-open
 *
 * @see ../README.md — the `## Schemas` section pins the stdin/decision shapes.
 * @see ../../../docs/appendix-a-copilot-contract.md — the audited upstream contract.
 */
import { open, type FileHandle } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import { runPlanReview } from "@symbiot/agent-runtime";
import { emitDecision } from "@symbiot/agent-runtime/decision";
import {
  flagValue,
  isNonEmptyString,
  isRecord,
  parsePort,
  readHookInput,
} from "@symbiot/agent-runtime/hook-input";
import { createMarkerStore } from "@symbiot/agent-runtime/marker-store";
// Bun's compile mode embeds this file into the binary; the import resolves to
// a `$bunfs/…` virtual path at runtime that fs APIs read transparently.
import viewerHtmlGz from "@symbiot/viewer/dist/embed/index.html.gz" with { type: "file" };

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

/**
 * Validate a parsed stdin payload as a genuine `agentStop` turn-end event, or
 * return `null` to pass through. Pure — gates on `stopReason === "end_turn"` and a
 * usable `transcriptPath`. Does NOT read the transcript (that is async I/O). A
 * missing `sessionId` degrades to `""` (the re-entrancy guard is then a no-op).
 */
export const parseAgentStop = (input: unknown): Required<CopilotAgentStopInput> | null => {
  if (!isRecord(input)) return null;
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
 * Copilot's transcript format is undocumented upstream (see `appendix-a-copilot-contract.md`);
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

const reentrancyStore = createMarkerStore({
  dir: join(homedir(), ".symbiot", "hook-state"),
  ttlMs: 60_000,
});

/**
 * True when this exact `(sessionId, plan)` was blocked within the TTL — i.e. the
 * block we emitted triggered a retry turn that re-emitted a byte-identical plan,
 * which would otherwise re-gate forever. A no-op (proceed) for an empty sessionId.
 */
export const isReentrant = async (sessionId: string, plan: string): Promise<boolean> =>
  sessionId.length === 0 ? false : reentrancyStore.isFresh(sessionId, plan);

/**
 * Record the marker for this `(sessionId, plan)` — written only when we are about
 * to block, so the TTL window is measured from the block (the retry fires within
 * seconds), not from a slow human review. A no-op for an empty sessionId.
 */
export const recordMarker = async (sessionId: string, plan: string): Promise<void> => {
  if (sessionId.length === 0) return;
  await reentrancyStore.record(sessionId, plan);
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
 * `argv` is the post-command tail. The optional `--port` / `--no-open` flags let
 * the headless E2E harness pin a viewer it can reach on a known URL.
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
