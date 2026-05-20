import { startServer } from "@symbiot/viewer";

/**
 * JSON payload Claude Code writes to the hook's stdin on `PreToolUse`. We only
 * care about `ExitPlanMode` invocations, which carry the proposed plan in
 * `tool_input.plan`.
 *
 * @example
 *   { "hook_event_name": "PreToolUse",
 *     "tool_name": "ExitPlanMode",
 *     "tool_input": { "plan": "# Plan\n\n..." } }
 */
interface PreToolUseInput {
  hook_event_name?: string;
  tool_name?: string;
  tool_input?: { plan?: string };
}

const readHookInput = async (): Promise<PreToolUseInput> => {
  const chunks: Uint8Array[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Uint8Array);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as PreToolUseInput;
};

const planFrom = (input: PreToolUseInput): string | null => {
  if (input.tool_name !== "ExitPlanMode") return null;
  return input.tool_input?.plan ?? null;
};

// TODO(symbiot#1, upstream anthropics/claude-code#50660): permissionDecision
// is currently silently ignored for ExitPlanMode in Claude Code, so this
// payload is a no-op at runtime until upstream ships the fix.
const emitApproveDecision = (): void => {
  const payload = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      permissionDecisionReason: "Reviewer approved plan in symbiot.",
    },
  };
  process.stdout.write(JSON.stringify(payload));
};

const emitDenyDecision = (feedback: string): void => {
  const payload = {
    decision: "block",
    reason: feedback.length > 0 ? feedback : "Reviewer requested changes.",
  };
  process.stdout.write(JSON.stringify(payload));
};

/**
 * Claude Code `PreToolUse` hook entry point matched against `ExitPlanMode`.
 * Hands the proposed plan to the viewer, blocks until the reviewer decides:
 * Approve → emit `{hookSpecificOutput: {permissionDecision: "allow"}}` so
 * Claude will auto-approve ExitPlanMode once anthropics/claude-code#50660 is
 * fixed; today that field is silently ignored for the ExitPlanMode matcher
 * and the reviewer still sees Claude Code's native 'Accept this plan?'
 * prompt. Request changes → emit `{decision: "block", reason}` so Claude
 * sees the feedback and revises (this path is unaffected by the upstream
 * bug because it uses the older top-level `decision` field).
 */
export const runHook = async (): Promise<number> => {
  const input = await readHookInput();
  const plan = planFrom(input);
  if (plan === null) return 0;
  const server = await startServer({ plan });
  process.stderr.write(`symbiot: review plan at ${server.url}\n`);
  const decision = await server.resolved;
  await server.stop();
  if (decision.kind === "approve") {
    emitApproveDecision();
    return 0;
  }
  emitDenyDecision(decision.feedback);
  return 0;
};
