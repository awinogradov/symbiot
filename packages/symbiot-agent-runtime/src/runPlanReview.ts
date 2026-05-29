/**
 * Shared spawn-and-decide loop for agent integrations.
 *
 * Every agent (Claude Code today; Codex/Gemini/Copilot/OpenCode next) drives the
 * same sequence to review a plan: spawn the {@link @symbiot/viewer} server, hand
 * the reviewer a URL, block until they decide, tear the server down, then map the
 * decision to a process exit code. {@link runPlanReview} owns that loop so each
 * agent only supplies the parts that genuinely differ — how it parses stdin and
 * how it emits its own decision shape — via the {@link RunPlanReviewOptions.onResolved}
 * callback. `@symbiot/viewer` (`startServer` / `RunningServer`) stays the boundary.
 *
 * @example
 * ```ts
 * import { runPlanReview } from "@symbiot/agent-runtime";
 *
 * const exitCode = await runPlanReview({
 *   plan,
 *   onStart: (url) => process.stderr.write(`review at ${url}\n`),
 *   onResolved: (decision) => (decision.kind === "approve" ? 0 : 2),
 * });
 * process.exit(exitCode);
 * ```
 */
import {
  startServer as defaultStartServer,
  type RunningServer,
  type StartServerOptions,
} from "@symbiot/viewer";

/**
 * The reviewer's decision, derived from the viewer boundary so this package
 * does not need its own copy of the `Decision` union (and the viewer stays
 * untouched). Resolves to `approve` / `deny` / `feedback`.
 */
type ReviewDecision = Awaited<RunningServer["resolved"]>;

/** Options for {@link runPlanReview}. */
export interface RunPlanReviewOptions {
  /** Plan or document markdown to review. */
  plan: string;
  /** Viewer mode: `plan` (Approve/Deny) or `annotate` (Submit feedback). Defaults to the viewer's own default (`plan`). */
  mode?: StartServerOptions["mode"];
  /** Extra viewer options (e.g. `indexHtmlGz`, `port`, `decisionFile`) forwarded to `startServer`. `plan` and `mode` are passed separately. */
  serverOptions?: Omit<StartServerOptions, "plan" | "mode">;
  /** Called once with the viewer URL right after the server boots — agents use it to print their own stderr line. Optional. */
  onStart?: (url: string) => void;
  /** Maps the reviewer's decision to the process exit code. The returned value becomes {@link runPlanReview}'s resolved value; agents emit their decision JSON here. */
  onResolved: (decision: ReviewDecision) => number | Promise<number>;
  /** Injection seam for tests; defaults to the real `@symbiot/viewer` `startServer`. Production callers omit it. */
  startServer?: typeof defaultStartServer;
}

/**
 * Run the spawn → await → decide loop and resolve to the exit code returned by
 * {@link RunPlanReviewOptions.onResolved}.
 *
 * `server.resolved` only ever resolves (it is wired from the viewer's POST
 * handler, never rejected), so teardown needs no `try`/`finally`.
 */
export const runPlanReview = async ({
  plan,
  mode,
  serverOptions,
  onStart,
  onResolved,
  startServer = defaultStartServer,
}: RunPlanReviewOptions): Promise<number> => {
  const server = await startServer({ plan, mode, ...serverOptions });
  onStart?.(server.url);
  const decision = await server.resolved;
  await server.stop();
  return onResolved(decision);
};
