import { createHash, randomUUID } from "node:crypto";
import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import { runPlanReview } from "@symbiot/agent-runtime";
import { emitBlockDecision } from "@symbiot/agent-runtime/decision";
// Bun's compile mode embeds this file into the binary; the import resolves to
// a `$bunfs/…` virtual path at runtime that fs APIs read transparently.
import viewerHtmlGz from "@symbiot/viewer/dist/embed/index.html.gz" with { type: "file" };

/**
 * JSON payload Claude Code writes to the hook's stdin. The same shape covers
 * both `PreToolUse` (drives the viewer) and `PermissionRequest` (defensive
 * short-circuit for anthropics/claude-code#50660). Only `ExitPlanMode`
 * invocations carry the plan in `tool_input.plan`; everything else is ignored.
 *
 * @example
 *   { "hook_event_name": "PreToolUse",
 *     "tool_name": "ExitPlanMode",
 *     "tool_input": { "plan": "# Plan\n\n..." } }
 */
interface HookInput {
  hook_event_name?: string;
  tool_name?: string;
  tool_input?: { plan?: string };
}

/** On-disk shape of the approve marker the PreToolUse run leaves for the PermissionRequest run. */
export interface ApproveMarker {
  planHash: string;
  approvedAt: number;
}

/** Anything older than this gates the PermissionRequest path back to "ask" — see runHook JSDoc. */
export const approveMarkerTtlMs = 60_000;

export const markerPath = (): string =>
  join(homedir(), ".symbiot", "hook-state", "last-approve.json");

const eventLogPath = (): string => join(homedir(), ".symbiot", "hook-state", "events.log");

const isMissingPath = (error: unknown): boolean => {
  const { code } = error as NodeJS.ErrnoException;
  return code === "ENOENT" || code === "ENOTDIR";
};

/**
 * Append a single JSON line per hook invocation for post-hoc debugging.
 * The log is observability, never load-bearing — failures must not
 * propagate (a throw would abort Claude Code's plan dispatch). Missing-
 * path errors stay silent (first-invocation case); other failures surface
 * a single-line warning on stderr so corruption / permission issues do
 * not vanish.
 */
const logEvent = async (entry: Record<string, unknown>): Promise<void> => {
  try {
    const target = eventLogPath();
    await mkdir(dirname(target), { recursive: true });
    await appendFile(target, `${JSON.stringify({ at: Date.now(), ...entry })}\n`, "utf8");
  } catch (error) {
    if (isMissingPath(error)) return;
    const code = (error as NodeJS.ErrnoException).code ?? "unknown";
    process.stderr.write(`symbiot: events.log write failed (${code})\n`);
  }
};

export const hashPlan = (plan: string): string => createHash("sha256").update(plan).digest("hex");

const readHookInput = async (): Promise<HookInput> => {
  const chunks: Uint8Array[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Uint8Array);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as HookInput;
};

const planFrom = (input: HookInput): string | null => {
  if (input.tool_name !== "ExitPlanMode") return null;
  return input.tool_input?.plan ?? null;
};

export const writeApproveMarker = async (planHash: string): Promise<void> => {
  const target = markerPath();
  await mkdir(dirname(target), { recursive: true });
  const payload: ApproveMarker = { planHash, approvedAt: Date.now() };
  const tmp = `${target}.${randomUUID()}.tmp`;
  await writeFile(tmp, JSON.stringify(payload), "utf8");
  await rename(tmp, target);
};

const isPlanHash = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);

const isApprovedAt = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isApproveMarker = (value: unknown): value is ApproveMarker => {
  if (typeof value !== "object" || value === null) return false;
  const { planHash, approvedAt } = value as Record<string, unknown>;
  return isPlanHash(planHash) && isApprovedAt(approvedAt);
};

/**
 * Read the most recent approve marker. Returns `null` on any failure
 * (missing file, malformed JSON, schema mismatch) so callers can fall back to
 * the no-op `permissionDecision: "ask"` path without partial signals.
 * Missing-path errors stay silent (no marker yet); other errors emit a
 * one-line stderr warning so corruption / permission issues are visible.
 */
export const readApproveMarker = async (): Promise<ApproveMarker | null> => {
  try {
    const raw = await readFile(markerPath(), "utf8");
    const parsed: unknown = JSON.parse(raw);
    return isApproveMarker(parsed) ? parsed : null;
  } catch (error) {
    if (!isMissingPath(error)) {
      const code = (error as NodeJS.ErrnoException).code ?? "parse";
      process.stderr.write(`symbiot: marker read failed (${code})\n`);
    }
    return null;
  }
};

export const isFreshFor = (marker: ApproveMarker, planHash: string, now: number): boolean =>
  marker.planHash === planHash && now - marker.approvedAt < approveMarkerTtlMs;

// TODO(symbiot#1, upstream anthropics/claude-code#50660): permissionDecision
// is currently silently ignored for ExitPlanMode in Claude Code, so this
// PreToolUse payload is a no-op at runtime until upstream ships the fix.
// The PermissionRequest hook below uses the nested decision.behavior
// schema (also Anthropic-documented) which IS honored for ExitPlanMode.
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

/** Shape of the `PermissionRequest` allow payload emitted on approve. */
interface PermissionRequestAllowPayload {
  hookSpecificOutput: {
    hookEventName: "PermissionRequest";
    decision: {
      behavior: "allow";
      updatedPermissions: Array<{ type: "setMode"; mode: "auto"; destination: "session" }>;
    };
  };
}

/**
 * The nested `{decision: {behavior: "allow"}}` shape Claude Code honors for the
 * `PermissionRequest(ExitPlanMode)` matcher — distinct from the PreToolUse-only
 * `permissionDecision` field. The `updatedPermissions` `setMode` entry
 * reproduces the choice the native "Accept this plan?" prompt offers ("start in
 * auto mode"): because the viewer replaces that prompt, the post-plan permission
 * mode must be carried here, or Claude Code falls back to its post-approval
 * `acceptEdits` default. Exported so the payload shape can be unit-asserted.
 */
export const permissionRequestAllowPayload = (): PermissionRequestAllowPayload => ({
  hookSpecificOutput: {
    hookEventName: "PermissionRequest",
    decision: {
      behavior: "allow",
      updatedPermissions: [{ type: "setMode", mode: "auto", destination: "session" }],
    },
  },
});

const emitPermissionRequestAllow = (): void => {
  process.stdout.write(JSON.stringify(permissionRequestAllowPayload()));
};

const runPreToolUse = (plan: string): Promise<number> => {
  const planHash = hashPlan(plan);
  return runPlanReview({
    plan,
    serverOptions: { indexHtmlGz: viewerHtmlGz, agentId: "claude-code" },
    onStart: (url) => process.stderr.write(`symbiot: review plan at ${url}\n`),
    onResolved: async (decision) => {
      if (decision.kind === "approve") {
        await writeApproveMarker(planHash);
        emitApproveDecision();
        await logEvent({ event: "PreToolUse", planHash, emitted: "allow" });
        return 0;
      }
      await emitBlockDecision(decision.feedback);
      await logEvent({ event: "PreToolUse", planHash, emitted: "block" });
      return 0;
    },
  });
};

const runPermissionRequest = async (plan: string): Promise<number> => {
  const planHash = hashPlan(plan);
  const marker = await readApproveMarker();
  const fresh = marker !== null && isFreshFor(marker, planHash, Date.now());
  if (fresh) {
    emitPermissionRequestAllow();
    await logEvent({ event: "PermissionRequest", planHash, marker, emitted: "allow" });
    return 0;
  }
  // No fresh marker → write nothing. Claude Code interprets empty hook
  // output as "no decision" and falls through to its native prompt,
  // matching today's UX without a hook at all (graceful degradation).
  await logEvent({ event: "PermissionRequest", planHash, marker, emitted: "passthrough" });
  return 0;
};

/**
 * Claude Code hook entry point for the `ExitPlanMode` tool. Handles two
 * events that the installer registers under the same matcher:
 *
 *   - `PreToolUse` — spawn the viewer, block until the reviewer decides.
 *     Approve → write a short-lived marker keyed by SHA-256 of the plan, then
 *     emit the documented `permissionDecision: "allow"` payload (no-op against
 *     today's #50660 bug, kept future-proof). Request changes → emit
 *     `{decision: "block", reason}` so Claude sees the feedback and revises;
 *     this path uses the older top-level `decision` field and is unaffected
 *     by the upstream bug. A `block` short-circuits tool dispatch, so
 *     `PermissionRequest` does not fire on the deny path.
 *   - `PermissionRequest` — suppresses Claude Code's native "Accept this
 *     plan?" prompt by emitting the nested `decision.behavior: "allow"`
 *     schema (NOT `permissionDecision` — that field is the PreToolUse-only
 *     schema and is ignored here). Reads the marker left by the PreToolUse
 *     run; if the plan hash matches and the marker is younger than 60 s,
 *     emits the allow payload, whose `updatedPermissions` `setMode` entry
 *     switches the session to `auto` mode (the native prompt's "start in auto
 *     mode" choice) instead of Claude Code's post-approval `acceptEdits`
 *     default. Otherwise writes nothing so Claude Code falls through to its
 *     native prompt — graceful degradation.
 */
export const runHook = async (): Promise<number> => {
  const input = await readHookInput();
  await logEvent({
    event: "invoked",
    hook_event_name: input.hook_event_name,
    tool_name: input.tool_name,
    hasPlan: typeof input.tool_input?.plan === "string",
  });
  const plan = planFrom(input);
  if (plan === null) return 0;
  if (input.hook_event_name === "PermissionRequest") {
    return runPermissionRequest(plan);
  }
  return runPreToolUse(plan);
};
