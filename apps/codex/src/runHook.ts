/**
 * Codex CLI `Stop` hook handler for `symbiot-codex run-hook`.
 *
 * Codex fires the `Stop` hook when a conversation turn completes and feeds the
 * hook a JSON payload on stdin. We treat the turn's `last_assistant_message` as
 * the plan to review: spawn the viewer via {@link runPlanReview} (the shared
 * `@symbiot/agent-runtime` loop) under the `codex` storage namespace, block
 * until the reviewer decides, then map the decision back to Codex —
 * `{"decision":"block","reason"}` on request-changes (Codex keeps going), or no
 * output + exit 0 on approve (Codex stops normally).
 *
 * Unlike Claude Code, Codex honors `decision:block` on `Stop` directly, so there
 * is no approve-marker or `PermissionRequest` companion. A `stop_hook_active`
 * guard limits review to one gate per stop-chain (a prior block already
 * re-triggered the turn), and any payload we cannot parse degrades to a
 * pass-through so a stuck/garbled hook never blocks Codex.
 *
 * @example
 *   echo '{"hook_event_name":"Stop","last_assistant_message":"# Plan\n…"}' \
 *     | bun src/cli.ts run-hook --no-open
 *
 * @see ../../README.md — the `## Schemas` section pins the stdin/decision shapes.
 * @see ../../../../packages/symbiot-agent-runtime/src/runPlanReview.ts — the spawn loop.
 */
import { runPlanReview } from "@symbiot/agent-runtime";
import type { RunningServer } from "@symbiot/viewer";
// Bun's compile mode embeds this file into the binary; the import resolves to
// a `$bunfs/…` virtual path at runtime that fs APIs read transparently.
import viewerHtmlGz from "@symbiot/viewer/dist/client/index.html.gz" with { type: "file" };

/** The reviewer's decision, derived from the viewer boundary (matches `runPlanReview`). */
type ReviewDecision = Awaited<RunningServer["resolved"]>;

/**
 * The subset of Codex's `Stop` hook stdin payload this handler reads. Codex
 * also sends `session_id`, `cwd`, `permission_mode`, `model`, … — those ride
 * along ignored.
 *
 * @example
 *   { "hook_event_name": "Stop",
 *     "last_assistant_message": "# Plan\n\n…",
 *     "stop_hook_active": false }
 */
export interface CodexStopInput {
  hook_event_name?: string;
  last_assistant_message?: string;
  stop_hook_active?: boolean;
}

const readHookInput = async (): Promise<unknown> => {
  const chunks: Uint8Array[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Uint8Array);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    // Malformed payload → pass through (return {} → planFromStop null → exit 0).
    // A spurious non-zero exit on a Stop hook risks being read as a block.
    return {};
  }
};

const asStopInput = (input: unknown): CodexStopInput | null =>
  typeof input === "object" && input !== null ? input : null;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

/**
 * Extract the reviewable plan from a parsed Codex stdin payload, or `null` to
 * pass through (let Codex stop). Returns the message only for a genuine `Stop`
 * event that is not a re-entrant continuation (`stop_hook_active`) and carries a
 * non-empty `last_assistant_message`.
 */
export const planFromStop = (input: unknown): string | null => {
  const stop = asStopInput(input);
  if (stop === null) return null;
  if (stop.hook_event_name !== "Stop") return null;
  if (stop.stop_hook_active === true) return null;
  return isNonEmptyString(stop.last_assistant_message) ? stop.last_assistant_message : null;
};

/**
 * Emit Codex's request-changes decision. `decision:block` makes Codex continue
 * the turn with `reason` as the steering feedback. Mirrors `apps/claude-code`'s deny
 * payload byte-for-byte, including the default reason.
 */
export const emitBlockDecision = (feedback: string): void => {
  const payload = {
    decision: "block",
    reason: feedback.length > 0 ? feedback : "Reviewer requested changes.",
  };
  process.stdout.write(JSON.stringify(payload));
};

/**
 * Map a reviewer decision to Codex's response and return the exit code.
 * `approve` writes nothing (Codex stops normally); request-changes emits
 * `decision:block`. Pure mapping — exported so the round trip is unit-testable
 * without a browser.
 */
export const emitDecision = (decision: ReviewDecision): number => {
  if (decision.kind === "approve") return 0;
  emitBlockDecision(decision.feedback);
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

/**
 * `symbiot-codex run-hook` entry point. Reads the Codex `Stop` payload from
 * stdin and, when it carries a reviewable plan, drives the viewer and emits the
 * Codex decision. Returns the process exit code.
 *
 * `argv` is the post-command tail (everything after `run-hook`). Production
 * Codex passes none → OS-assigned port, browser opens. The optional `--port` /
 * `--no-open` flags mirror `apps/viewer/src/bin.ts` and let the E2E harness
 * drive a pinned, headless viewer it can reach on a known URL.
 */
export const runHook = async (argv: string[]): Promise<number> => {
  const input = await readHookInput();
  const plan = planFromStop(input);
  if (plan === null) return 0;
  const port = parsePort(flagValue(argv, "--port"));
  const noOpen = argv.includes("--no-open");
  return runPlanReview({
    plan,
    serverOptions: {
      indexHtmlGz: viewerHtmlGz,
      agentId: "codex",
      port,
      openInBrowser: !noOpen,
    },
    onStart: (url) => process.stderr.write(`symbiot-codex: review plan at ${url}\n`),
    onResolved: emitDecision,
  });
};
