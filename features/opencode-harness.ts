/**
 * Bun-only harness that drives the in-process OpenCode plugin against a fixture so
 * a Playwright-BDD scenario can review it in a real viewer. Spawned by
 * `support/opencodeProcess.ts` as a subprocess — it lives OUTSIDE `features/steps`
 * and `features/support` on purpose, so `bddgen` never imports it (importing it
 * would pull in the embedded viewer `.gz`, which the runner's babel transform
 * cannot parse).
 *
 * Phase 1 opens the viewer and blocks until the reviewer submits via Playwright.
 * Phase 2 simulates the next turn: it injects the persisted feedback from disk,
 * proving the feedback survives the session boundary. Emits a one-line JSON result
 * (`{ inboxPath, injected }`) for the controller to assert against.
 *
 * Types are derived from the plugin's own signatures (`Parameters<typeof …>`) so
 * this file never imports `@opencode-ai/*`, which is not resolvable from `features/`.
 */
import { readFile } from "node:fs/promises";

import type { MessageWithParts } from "../apps/opencode-plugin/src/lastAssistantMessage.ts";
import { injectPendingFeedback, reviewSession } from "../apps/opencode-plugin/src/plugin.ts";
import { inboxPath } from "../apps/opencode-plugin/src/storage.ts";

interface Fixture {
  sessionID: string;
  messages: MessageWithParts[];
}

const [, , portArg, fixtureArg] = process.argv;

const main = async (): Promise<void> => {
  const fixture = JSON.parse(await readFile(fixtureArg, "utf8")) as Fixture;
  const client = {
    session: { messages: async () => ({ data: fixture.messages }) },
  } as unknown as Parameters<typeof reviewSession>[0];

  // Phase 1 — open the viewer; resolves once the reviewer requests changes.
  await reviewSession(client, fixture.sessionID, { port: Number(portArg), openInBrowser: false });

  // Phase 2 — the next turn reads the persisted feedback from disk and injects it.
  const output: Parameters<typeof injectPendingFeedback>[1] = { parts: [] };
  await injectPendingFeedback({ sessionID: fixture.sessionID, messageID: "msg_next" }, output);

  const [first] = output.parts;
  const injected = first !== undefined && first.type === "text" ? first.text : null;
  process.stdout.write(
    `${JSON.stringify({ inboxPath: inboxPath(fixture.sessionID), injected })}\n`
  );
};

main().then(
  () => process.exit(0),
  (error: unknown) => {
    process.stderr.write(
      `opencode-harness: ${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exit(1);
  }
);
