/**
 * `symbiot draft [file.md] [--slug <slug>]` — boot the viewer in the edit-first
 * draft mode under the `claude-code` storage namespace via the shared
 * {@link runDraftShared}. Blocks until the author sends the draft to the agent
 * or approves it, then emits the marker line the `/draft` skill parses. Marker
 * and exit-code contract: `docs/03-server-contract.md`.
 */
import { runDraft as runDraftShared } from "@symbiot/agent-runtime/draft";
// Bun's compile mode embeds this file into the binary; the import resolves to
// a `$bunfs/…` virtual path at runtime that fs APIs read transparently.
import viewerHtmlGz from "@symbiot/viewer/dist/embed/index.html.gz" with { type: "file" };

export const runDraft = (argv: string[]): Promise<number> =>
  runDraftShared({
    argv,
    binName: "symbiot",
    agentId: "claude-code",
    indexHtmlGz: viewerHtmlGz,
  });
