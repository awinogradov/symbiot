/**
 * symbiot's in-process OpenCode plugin: fire-and-forget review on `session.idle`.
 *
 * OpenCode loads this plugin inside its own process and DROPS the promise returned
 * by the `event` hook on `session.idle` (upstream sst/opencode#16626 is still open),
 * so symbiot cannot block the turn the way the Codex/Gemini/Copilot CLI hooks do.
 * Instead, on `session.idle` we save the latest assistant response to the inbox and
 * open the viewer fire-and-forget; the reviewer's feedback is persisted and injected
 * into the NEXT user turn via the awaited `chat.message` hook.
 *
 * Running in-process imposes two hard rules: never call `process.exit`, and never
 * let a rejection escape (it would surface as an `unhandledRejection` on the host).
 * The background review is therefore `void reviewSession(...).catch(reportError)`.
 *
 * @see ./README.md — what works, what doesn't, and the upstream blocker.
 */
import { randomUUID } from "node:crypto";

import type { Plugin, PluginInput } from "@opencode-ai/plugin";
import type { Part } from "@opencode-ai/sdk";
import { startServer as defaultStartServer, type RunningServer } from "@symbiot/viewer";
// Bun resolves this embedded prebuilt viewer bundle to a real path at runtime.
import viewerHtmlGz from "@symbiot/viewer/dist/embed/index.html.gz" with { type: "file" };

import { extractLatestAssistantText } from "./lastAssistantMessage.ts";
import { claimPendingFeedback, writeInbox, writePendingFeedback } from "./storage.ts";

/** The OpenCode SDK client handed to the plugin via {@link PluginInput}. */
type OpencodeClient = PluginInput["client"];

/** The reviewer's decision, derived from the viewer boundary (`approve`/`deny`/`feedback`). */
type Decision = Awaited<RunningServer["resolved"]>;

/** Storage namespace slug — state lands under `~/.symbiot/agents/opencode/`. */
const agentId = "opencode";

/** Prefix marking the reviewer feedback block injected on the next user turn. */
const feedbackPrefix = "[Reviewer feedback]: ";

/** Abandoned reviews must not leak: stop the viewer after this long with no decision. */
const defaultReviewTimeoutMs = 60 * 60 * 1000;

/** Backstop against a sessionID-keying bug spawning unbounded viewers. */
const maxLiveServers = 8;

/** Seams for tests/harness (stub `startServer`, pin a port, skip the browser); production omits all. */
export interface ReviewDeps {
  startServer?: typeof defaultStartServer;
  openInBrowser?: boolean;
  port?: number | null;
  timeoutMs?: number;
}

/** One live viewer per session — a fresh idle event replaces the prior one. */
const liveServers = new Map<string, RunningServer>();

/** Monotonic per-session review counter — a newer idle supersedes older in-flight reviews. */
const reviewGenerations = new Map<string, number>();

/** Claim the next review generation for a session; only the latest may persist its feedback. */
const nextReviewGeneration = (sessionID: string): number => {
  const generation = (reviewGenerations.get(sessionID) ?? 0) + 1;
  reviewGenerations.set(sessionID, generation);
  return generation;
};

/** Report without ever throwing or exiting — this code runs inside the host process. */
const reportError = (error: unknown): void => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`symbiot-opencode-plugin: ${message}\n`);
};

/** Resolve to `null` after `ms`; `unref` so the pending timer never holds the host open. */
const idleTimeout = (ms: number): Promise<null> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(null), ms).unref();
  });

/** Fetch the session's messages and reduce them to the latest assistant text. */
const loadLatestResponse = async (client: OpencodeClient, sessionID: string): Promise<string> => {
  const result = await client.session.messages({ path: { id: sessionID } });
  return extractLatestAssistantText(result.data ?? []);
};

/** Stop and forget any viewer already open for this session (one review per session). */
const stopPriorReview = async (sessionID: string): Promise<void> => {
  const prior = liveServers.get(sessionID);
  if (prior === undefined) return;
  liveServers.delete(sessionID);
  await prior.stop().catch(reportError);
};

/** Open the viewer for the response under review, applying the production/test defaults. */
const openReview = (response: string, deps: ReviewDeps): Promise<RunningServer> =>
  (deps.startServer ?? defaultStartServer)({
    plan: response,
    agentId,
    indexHtmlGz: viewerHtmlGz,
    openInBrowser: deps.openInBrowser ?? true,
    port: deps.port ?? null,
  });

/** Resolve to the reviewer's decision, or `null` if the review times out. */
const awaitDecision = (server: RunningServer, deps: ReviewDeps): Promise<Decision | null> =>
  Promise.race([server.resolved, idleTimeout(deps.timeoutMs ?? defaultReviewTimeoutMs)]);

/**
 * Persist feedback for the next turn — but only when the reviewer requested changes
 * AND no newer idle superseded this review while it awaited the human decision
 * (a stale generation's feedback would otherwise clobber the latest response's review).
 */
const persistIfFeedback = async (
  sessionID: string,
  generation: number,
  decision: Decision | null
): Promise<void> => {
  if (decision === null || decision.kind === "approve") return;
  if (reviewGenerations.get(sessionID) !== generation) return;
  await writePendingFeedback(sessionID, decision.feedback);
};

/** Tear down a finished review: drop its map/generation entries (only if still ours), stop the viewer. */
const finishReview = async (
  sessionID: string,
  generation: number,
  server: RunningServer
): Promise<void> => {
  if (liveServers.get(sessionID) === server) liveServers.delete(sessionID);
  if (reviewGenerations.get(sessionID) === generation) reviewGenerations.delete(sessionID);
  await server.stop().catch(reportError);
};

/**
 * Save the session's latest assistant response and open the viewer for review.
 * Fire-and-forget from the host's perspective, but awaited here so the in-process
 * viewer is always torn down — `Promise.race` against an idle timeout caps the
 * lifetime when a reviewer never decides. Persists feedback for the next turn when
 * the reviewer requests changes.
 */
export const reviewSession = async (
  client: OpencodeClient,
  sessionID: string,
  deps: ReviewDeps = {}
): Promise<void> => {
  const response = await loadLatestResponse(client, sessionID);
  if (response.length === 0) return;
  await writeInbox(sessionID, response);
  await stopPriorReview(sessionID);
  if (liveServers.size >= maxLiveServers) return;

  const generation = nextReviewGeneration(sessionID);
  const server = await openReview(response, deps);
  liveServers.set(sessionID, server);
  try {
    await persistIfFeedback(sessionID, generation, await awaitDecision(server, deps));
  } finally {
    await finishReview(sessionID, generation, server);
  }
};

/** A synthetic user text part carrying the reviewer feedback block. */
const feedbackPart = (sessionID: string, messageID: string, feedback: string): Part => ({
  id: `prt_${randomUUID()}`,
  sessionID,
  messageID,
  type: "text",
  text: `${feedbackPrefix}${feedback}`,
  synthetic: true,
});

/**
 * Claim any pending feedback for the session and prepend it as a synthetic text
 * part on the outgoing user message. Consume-once (the claim renames atomically)
 * and resilient — a storage error degrades to "no injection", never a thrown turn.
 */
export const injectPendingFeedback = async (
  input: { sessionID: string; messageID?: string },
  output: { parts: Part[] }
): Promise<void> => {
  try {
    const feedback = await claimPendingFeedback(input.sessionID);
    if (feedback === null || feedback.length === 0) return;
    const messageID = input.messageID ?? `msg_${randomUUID()}`;
    output.parts.unshift(feedbackPart(input.sessionID, messageID, feedback));
  } catch (error) {
    reportError(error);
  }
};

/**
 * Build the symbiot OpenCode plugin. `deps` is a seam for tests/the BDD harness
 * (inject a stub `startServer`, pin a port, disable the browser); production omits it.
 */
export const createOpencodePlugin =
  (deps: ReviewDeps = {}): Plugin =>
  async (input: PluginInput) => ({
    // Fire-and-forget: the host drops this promise on session.idle, so we own the
    // catch and never await the review here (awaiting would block nothing anyway).
    event: async ({ event }) => {
      if (event.type !== "session.idle") return;
      void reviewSession(input.client, event.properties.sessionID, deps).catch(reportError);
    },
    // Awaited by the host — reliably injects the reviewer's feedback into the next turn.
    "chat.message": async (chatInput, output) => {
      await injectPendingFeedback(chatInput, output);
    },
  });

/** The plugin instance OpenCode loads from `opencode.json` / the plugins directory. */
export const SymbiotOpenCodePlugin: Plugin = createOpencodePlugin();
