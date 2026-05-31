/**
 * The agent-agnostic request-changes decision contract shared by the stdin-driven
 * hook agents (Codex, Gemini, Copilot, and Claude Code's deny path).
 *
 * Every one of those agents maps a reviewer "request changes" to the identical
 * `{"decision":"block","reason"}` payload on stdout, and "approve" to no output
 * plus exit 0. {@link emitBlockDecision} / {@link emitDecision} own that mapping
 * so it lives in exactly one place. The write is buffered and drained before the
 * caller returns — a truncated `{"decision":"block"…` would be read by the host
 * as a phantom block.
 *
 * Claude Code's *approve* path is bespoke (it emits a `permissionDecision` allow
 * payload, not silence), so it reuses {@link emitBlockDecision} for deny only.
 *
 * @example
 * ```ts
 * import { emitDecision } from "@symbiot/agent-runtime/decision";
 * const exitCode = await emitDecision(decision); // 0; writes block JSON on deny
 * ```
 */
import type { RunningServer } from "@symbiot/viewer";

/** The reviewer's decision, derived from the viewer boundary (matches `runPlanReview`). */
type ReviewDecision = Awaited<RunningServer["resolved"]>;

/**
 * Write to stdout and await drain on backpressure, so the full payload is flushed
 * before the process exits.
 */
const writeStdout = async (text: string): Promise<void> => {
  if (!process.stdout.write(text)) {
    await new Promise<void>((resolve) => process.stdout.once("drain", resolve));
  }
};

/**
 * Emit the request-changes decision: `{"decision":"block","reason"}`. The host
 * runs another turn with `reason` as the steering prompt. Empty feedback falls
 * back to a default reason.
 */
export const emitBlockDecision = async (feedback: string): Promise<void> => {
  const payload = {
    decision: "block",
    reason: feedback.length > 0 ? feedback : "Reviewer requested changes.",
  };
  await writeStdout(JSON.stringify(payload));
};

/**
 * Map a reviewer decision to the host's response and return the exit code.
 * `approve` writes nothing (the turn ends); request-changes emits the block
 * payload. Always resolves to 0 — a non-zero exit on these stop-style hooks risks
 * being read as a block.
 */
export const emitDecision = async (decision: ReviewDecision): Promise<number> => {
  if (decision.kind === "approve") return 0;
  await emitBlockDecision(decision.feedback);
  return 0;
};
