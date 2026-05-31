/**
 * Gemini CLI `AfterAgent` hook handler for `symbiot-gemini run-hook`.
 *
 * Gemini fires the `AfterAgent` hook once per turn, after the model generates
 * its final response, and feeds the hook a JSON payload on stdin. We treat the
 * turn's `prompt_response` as the plan to review: spawn the viewer via
 * {@link runPlanReview} (the shared `@symbiot/agent-runtime` loop) under the
 * `gemini` storage namespace, block until the reviewer decides, then map the
 * decision back to Gemini — `{"decision":"block","reason"}` on request-changes,
 * or no output + exit 0 on approve.
 *
 * Like Codex, Gemini honors a blocking decision on this event directly, so there
 * is no approve-marker or `PermissionRequest` companion. Gemini's reference
 * spells the blocking decision `"deny"` and treats `"block"` as an alias; we
 * emit `"block"` so the payload is byte-identical to `apps/claude-code` and
 * `apps/codex` (the agent-agnostic contract). On `AfterAgent`, that decision
 * **rejects the response and forces a retry turn** with `reason` as the
 * correction prompt (it is not a same-turn continuation). A `stop_hook_active`
 * guard limits review to one gate per retry-chain (a prior block already
 * re-triggered the turn), and any payload we cannot parse degrades to a
 * pass-through so a stuck/garbled hook never blocks Gemini.
 *
 * @example
 *   echo '{"hook_event_name":"AfterAgent","prompt_response":"# Plan\n…"}' \
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
 * The subset of Gemini's `AfterAgent` hook stdin payload this handler reads.
 * Gemini also sends `prompt` (the user's original request), `session_id`,
 * `transcript_path`, `cwd`, `timestamp`, … — those ride along ignored. The
 * fields are optional here (not on the wire) only because the parser is
 * defensive against malformed input.
 *
 * @example
 *   { "hook_event_name": "AfterAgent",
 *     "prompt_response": "# Plan\n\n…",
 *     "stop_hook_active": false }
 */
export interface GeminiAfterAgentInput {
  hook_event_name?: string;
  prompt_response?: string;
  stop_hook_active?: boolean;
}

const readHookInput = async (): Promise<unknown> => {
  const chunks: Uint8Array[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Uint8Array);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    // Malformed payload → pass through (return {} → planFromAfterAgent null → exit 0).
    // A spurious non-zero exit on an AfterAgent hook risks being read as a retry.
    return {};
  }
};

const asAfterAgentInput = (input: unknown): GeminiAfterAgentInput | null =>
  typeof input === "object" && input !== null ? input : null;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

/**
 * Extract the reviewable plan from a parsed Gemini stdin payload, or `null` to
 * pass through (let Gemini accept the response). Returns the message only for a
 * genuine `AfterAgent` event that is not a re-entrant retry (`stop_hook_active`)
 * and carries a non-empty `prompt_response`.
 */
export const planFromAfterAgent = (input: unknown): string | null => {
  const afterAgent = asAfterAgentInput(input);
  if (afterAgent === null) return null;
  if (afterAgent.hook_event_name !== "AfterAgent") return null;
  if (afterAgent.stop_hook_active === true) return null;
  return isNonEmptyString(afterAgent.prompt_response) ? afterAgent.prompt_response : null;
};

/**
 * Emit Gemini's request-changes decision. `decision:block` (an alias of
 * Gemini's `deny`) rejects the response and forces a retry turn with `reason`
 * as the steering feedback. Mirrors `apps/claude-code`'s deny payload
 * byte-for-byte, including the default reason.
 */
export const emitBlockDecision = (feedback: string): void => {
  const payload = {
    decision: "block",
    reason: feedback.length > 0 ? feedback : "Reviewer requested changes.",
  };
  process.stdout.write(JSON.stringify(payload));
};

/**
 * Map a reviewer decision to Gemini's response and return the exit code.
 * `approve` writes nothing (Gemini accepts the response; the turn ends);
 * request-changes emits `decision:block`. Pure mapping — exported so the round
 * trip is unit-testable without a browser.
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
 * `symbiot-gemini run-hook` entry point. Reads the Gemini `AfterAgent` payload
 * from stdin and, when it carries a reviewable plan, drives the viewer and emits
 * the Gemini decision. Returns the process exit code.
 *
 * `argv` is the post-command tail (everything after `run-hook`). Production
 * Gemini passes none → OS-assigned port, browser opens. The optional `--port` /
 * `--no-open` flags mirror `apps/viewer/src/bin.ts` and let the E2E harness
 * drive a pinned, headless viewer it can reach on a known URL.
 */
export const runHook = async (argv: string[]): Promise<number> => {
  const input = await readHookInput();
  const plan = planFromAfterAgent(input);
  if (plan === null) return 0;
  const port = parsePort(flagValue(argv, "--port"));
  const noOpen = argv.includes("--no-open");
  return runPlanReview({
    plan,
    serverOptions: {
      indexHtmlGz: viewerHtmlGz,
      agentId: "gemini",
      port,
      openInBrowser: !noOpen,
    },
    onStart: (url) => process.stderr.write(`symbiot-gemini: review plan at ${url}\n`),
    onResolved: emitDecision,
  });
};
