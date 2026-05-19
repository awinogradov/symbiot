import { startServer } from "@symbiot/viewer";

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
 * Approve → exit 0 (Claude proceeds with ExitPlanMode); Request changes →
 * emit `{decision: "block", reason}` so Claude sees the feedback and revises.
 */
export const runHook = async (): Promise<number> => {
  const input = await readHookInput();
  const plan = planFrom(input);
  if (plan === null) return 0;
  const server = await startServer({ plan });
  process.stderr.write(`symbiot: review plan at ${server.url}\n`);
  const decision = await server.resolved;
  await server.stop();
  if (decision.kind === "approve") return 0;
  emitDenyDecision(decision.feedback);
  return 0;
};
