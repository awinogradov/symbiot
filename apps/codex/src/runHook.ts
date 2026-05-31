/**
 * Codex CLI `Stop` hook handler for `symbiot-codex run-hook`.
 *
 * Codex fires `Stop` when a turn completes and pipes a JSON payload on stdin. We
 * treat the turn's `last_assistant_message` as the plan to review: extract it via
 * the shared {@link createStopPlanExtractor}, spawn the viewer via the shared
 * {@link runPlanReview} loop under the `codex` storage namespace, block until the
 * reviewer decides, then map the decision back to Codex via the shared
 * {@link emitDecision} — `{"decision":"block","reason"}` on request-changes
 * (Codex keeps going), or no output + exit 0 on approve.
 *
 * A `stop_hook_active` guard (in the extractor) limits review to one gate per
 * stop-chain, and any unparseable payload degrades to a pass-through so a
 * stuck/garbled hook never blocks Codex.
 *
 * @example
 *   echo '{"hook_event_name":"Stop","last_assistant_message":"# Plan\n…"}' \
 *     | bun src/cli.ts run-hook --no-open
 *
 * @see ../../README.md — the `## Schemas` section pins the stdin/decision shapes.
 */
import { runPlanReview } from "@symbiot/agent-runtime";
import { emitDecision } from "@symbiot/agent-runtime/decision";
import {
  createStopPlanExtractor,
  flagValue,
  parsePort,
  readHookInput,
} from "@symbiot/agent-runtime/hook-input";
// Bun's compile mode embeds this file into the binary; the import resolves to
// a `$bunfs/…` virtual path at runtime that fs APIs read transparently.
import viewerHtmlGz from "@symbiot/viewer/dist/client/index.html.gz" with { type: "file" };

const planFromStop = createStopPlanExtractor({
  eventName: "Stop",
  messageField: "last_assistant_message",
});

/**
 * `symbiot-codex run-hook` entry point. Reads the Codex `Stop` payload from stdin
 * and, when it carries a reviewable plan, drives the viewer and emits the Codex
 * decision. Returns the process exit code. `argv` is the post-command tail; the
 * optional `--port` / `--no-open` flags let the E2E harness pin a headless viewer.
 */
export const runHook = async (argv: string[]): Promise<number> => {
  const plan = planFromStop(await readHookInput());
  if (plan === null) return 0;
  const port = parsePort(flagValue(argv, "--port"));
  const noOpen = argv.includes("--no-open");
  return runPlanReview({
    plan,
    serverOptions: { indexHtmlGz: viewerHtmlGz, agentId: "codex", port, openInBrowser: !noOpen },
    onStart: (url) => process.stderr.write(`symbiot-codex: review plan at ${url}\n`),
    onResolved: emitDecision,
  });
};
