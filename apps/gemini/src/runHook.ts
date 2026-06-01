/**
 * Gemini CLI `AfterAgent` hook handler for `symbiot-gemini run-hook`.
 *
 * Gemini fires `AfterAgent` once per turn after the model's final response and
 * pipes a JSON payload on stdin. We treat the turn's `prompt_response` as the
 * plan to review: extract it via the shared {@link createStopPlanExtractor},
 * spawn the viewer via the shared {@link runPlanReview} loop under the `gemini`
 * storage namespace, block until the reviewer decides, then map the decision back
 * via the shared {@link emitDecision}. `{"decision":"block","reason"}` rejects the
 * response and forces a retry turn with `reason` as the correction prompt; approve
 * writes nothing + exits 0.
 *
 * A `stop_hook_active` guard (in the extractor) limits review to one gate per
 * retry-chain, and any unparseable payload degrades to a pass-through so a
 * stuck/garbled hook never blocks Gemini.
 *
 * @example
 *   echo '{"hook_event_name":"AfterAgent","prompt_response":"# Plan\n…"}' \
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
import viewerHtmlGz from "@symbiot/viewer/dist/embed/index.html.gz" with { type: "file" };

const planFromAfterAgent = createStopPlanExtractor({
  eventName: "AfterAgent",
  messageField: "prompt_response",
});

/**
 * `symbiot-gemini run-hook` entry point. Reads the Gemini `AfterAgent` payload
 * from stdin and, when it carries a reviewable plan, drives the viewer and emits
 * the Gemini decision. Returns the process exit code. `argv` is the post-command
 * tail; the optional `--port` / `--no-open` flags let the E2E harness pin a
 * headless viewer.
 */
export const runHook = async (argv: string[]): Promise<number> => {
  const plan = planFromAfterAgent(await readHookInput());
  if (plan === null) return 0;
  const port = parsePort(flagValue(argv, "--port"));
  const noOpen = argv.includes("--no-open");
  return runPlanReview({
    plan,
    serverOptions: { indexHtmlGz: viewerHtmlGz, agentId: "gemini", port, openInBrowser: !noOpen },
    onStart: (url) => process.stderr.write(`symbiot-gemini: review plan at ${url}\n`),
    onResolved: emitDecision,
  });
};
