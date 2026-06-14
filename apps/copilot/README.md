# @symbiot/copilot

GitHub Copilot CLI integration for symbiot. Installs a Copilot `agentStop` hook
that intercepts the agent's turn-final output, forwards it to the symbiot viewer
for review, and returns a Copilot-shaped decision — approve to let the turn end,
or request changes to send markdown feedback back and make Copilot retry the turn.

This is the fourth agent integration after `apps/claude-code` (Claude Code),
`apps/codex` (Codex CLI), and `apps/gemini` (Gemini CLI). It exists to keep
proving the symbiot server contract is agent-agnostic: Copilot's `agentStop`
decision accepts the exact `{"decision":"block","reason"}` shape the other three
already consume, so the agent-specific code here is a thin stdin parser +
transcript reader + decision emitter wrapping the shared `@symbiot/agent-runtime`
loop.

> The upstream hook contract was undocumented when issue #67 was filed. It is now
> source-verified and pinned in
> [`docs/appendix-a-copilot-contract.md`](../../docs/appendix-a-copilot-contract.md) —
> read that first; this README is the integration's usage surface.

## Architecture

```
Copilot CLI
  │ agentStop hook  (~/.copilot/hooks/symbiot-copilot.json)
  ▼
symbiot-copilot run-hook
  │ parse agentStop stdin → tail-read transcriptPath → last assistant message
  ▼
@symbiot/agent-runtime  runPlanReview({ agentId: "copilot" })
  │ spawns the embedded viewer
  ▼
apps/viewer  (HTTP server + UI)
  │ reviewer approves / requests changes
  ▼
decision → stdout
  • approve         → no output, exit 0   (Copilot lets the turn end)
  • request changes → {"decision":"block","reason":<feedback>}  (Copilot retries the turn)
```

Plan history, annotations, drafts, and uploads persist under
`~/.symbiot/agents/copilot/` — the per-agent storage namespace threaded through
`startServer({ agentId: "copilot" })`, so Copilot never collides with Claude
Code, Codex, or Gemini on a shared plan slug.

## Installation

**End users (no clone, no Bun)** — download the verified binary and wire the hook:

```sh
curl -fsSL https://raw.githubusercontent.com/awinogradov/symbiot/main/scripts/install.sh | bash -s -- --agent copilot
# Windows (PowerShell):
# & ([scriptblock]::Create((irm https://raw.githubusercontent.com/awinogradov/symbiot/main/scripts/install.ps1))) -Agent copilot
```

This installs `symbiot-copilot` to `~/.local/bin` (verified against the release
`SHA256SUMS`) and runs its `install-hook`.

**Contributors (from a clone)**:

```sh
bun --filter @symbiot/copilot install-hook    # writes the agentStop hook to ~/.copilot/hooks/symbiot-copilot.json
bun --filter @symbiot/copilot uninstall-hook   # removes it
```

`install-hook` owns a dedicated `~/.copilot/hooks/symbiot-copilot.json` (Copilot
loads command hooks from a directory of independent files, so there is no shared
file to merge into). It is idempotent — re-running writes a byte-identical file —
and atomic (tmp + rename). The entry carries a `_managedBy: "symbiot-copilot"`
ownership sentinel; `uninstall-hook` only deletes a file that still carries it, so
a hand-edited file is left in place with a warning rather than blind-deleted. From
a clone the command points at source `cli.ts` (not a bundle) so the embedded
viewer's relative `dist/client/` path math stays intact; the compiled binary emits
the bare `symbiot-copilot run-hook` instead.

## Example flow

1. You install the hook once (`install-hook`).
2. Copilot CLI works on a task. When the main agent finishes a turn, Copilot fires
   the `agentStop` hook, piping a JSON payload (`{ sessionId, transcriptPath,
stopReason: "end_turn", … }`) to `symbiot-copilot run-hook` on stdin.
3. `run-hook` tail-reads the transcript at `transcriptPath`, extracts the last
   assistant message as the plan, and opens the viewer in your browser.
4. You **approve** → the hook writes nothing and exits `0`; Copilot lets the turn
   end normally.
5. Or you **request changes** with markdown feedback → the hook emits
   `{"decision":"block","reason":<feedback>}`; Copilot runs **another turn** using
   your feedback as the steering prompt, then fires `agentStop` again for the
   revised plan.

## Usage

Once installed, the hook is automatic: when a Copilot turn ends, the viewer opens
in your browser. Approve to let the turn finish, or Request changes to send
markdown feedback that Copilot acts on in a retry turn.

The CLI can also annotate any markdown file outside the hook flow:

```sh
bun src/cli.ts annotate path/to/document.md
```

## Schemas

`run-hook` reads this subset of Copilot's `agentStop` hook stdin payload (camelCase
form, selected by the `agentStop` event name; `timestamp` and `cwd` ride along
ignored). **There is no inline assistant message — only `transcriptPath`** — so the
plan text is read from the transcript:

```ts
interface CopilotAgentStopInput {
  sessionId?: string; // names the re-entrancy marker
  transcriptPath?: string; // tail-read for the last assistant message (the plan)
  stopReason?: string; // gated on "end_turn"
}
```

```json
{
  "sessionId": "abc123",
  "transcriptPath": "/Users/me/.copilot/history/session-abc123/transcript.jsonl",
  "stopReason": "end_turn"
}
```

> Registering the hook under the PascalCase name `Stop` instead delivers the
> VSCode/Claude-compatible snake_case payload (`hook_event_name: "Stop"`,
> `transcript_path`, `stop_reason`). symbiot registers under `agentStop` and reads
> the camelCase form. The audit-only `preToolUse` surface and the full event list
> live in [`appendix-a-copilot-contract.md`](../../docs/appendix-a-copilot-contract.md).

Decision emitted to stdout:

```jsonc
// request changes — Copilot rejects the turn and retries with this feedback as the prompt
{ "decision": "block", "reason": "<feedback markdown>" }
// approve — no stdout, exit 0; Copilot lets the turn end
```

Config `install-hook` writes to `~/.copilot/hooks/symbiot-copilot.json`. **Copilot
hook `timeoutSec` is in seconds** (default `30`) — so the value below is one hour,
matching Codex's seconds (Gemini uses milliseconds). `run-hook` blocks while a
human reviews, hence the long value:

```json
{
  "version": 1,
  "hooks": {
    "agentStop": [
      {
        "type": "command",
        "command": "bun /abs/path/apps/copilot/src/cli.ts run-hook",
        "timeoutSec": 3600,
        "_managedBy": "symbiot-copilot"
      }
    ]
  }
}
```

A malformed or unreadable payload — or an unrecognized transcript shape — degrades
to a pass-through (no output, exit 0). An `agentStop` hook must never emit a
spurious block.

## Known limitations

- **Transcript format is `pending-live-confirmation`.** `agentStop` exposes only
  `transcriptPath`; the transcript file's on-disk schema is undocumented upstream
  and could not be captured from a live Copilot CLI during the audit. `run-hook`
  parses it as Claude/VSCode-compatible JSONL (a well-grounded inference, since
  every documented Copilot hook payload is "VSCode Copilot extension compatible")
  and **fails open** — an unrecognized shape yields no review rather than a wrong
  block. Validate `extractLastAssistantMessage` against a real `agentStop` run
  before relying on it in anger; see
  [`appendix-a-copilot-contract.md`](../../docs/appendix-a-copilot-contract.md) claim #13.
- **Review must finish within `timeoutSec` (we write `3600`).** Copilot logs and
  skips a hook that times out or crashes — it never blocks the agent — so a review
  left open past one hour lets the turn proceed **un-reviewed** (timeout ⇒ proceed,
  not deny). Re-run the turn if that happens.
- **The re-entrancy guard auto-approves a byte-identical re-emission.** Copilot's
  `agentStop` has no `stop_hook_active` field, so `run-hook` self-manages a marker
  (`~/.symbiot/hook-state/<sessionId>.json`, plan-hash + 60s TTL). A genuine
  revision (different plan) is always re-reviewed; only an identical plan re-emitted
  within the TTL is passed through, to break a block→retry→block loop.
- **Hooks ≠ the Extensions SDK.** This integration uses Copilot's **CLI command
  hooks** (`~/.copilot/hooks/*.json`). The programmatic JSON-RPC Extensions SDK
  (`@github/copilot-sdk`) is a separate surface — and notably has no `agentStop` —
  and is out of scope (issue #67).

## Local development

```sh
bun run typecheck   # tsc --noEmit
bun run lint        # eslint . --max-warnings=0
bun run test        # vitest (installHook + runHook units)
```

The viewer must be built first so the embedded `index.html.gz` resolves
(Turborepo handles this via `dependsOn: ["^build"]`):

```sh
bun --filter @symbiot/viewer build
```

### Scripts

- `bun run build` — non-compiled JS bundle of the CLI (dev convenience).
- `bun run install-hook` / `uninstall-hook` / `run-hook` — invoke the CLI directly.
- `bun run typecheck` — `tsc --noEmit`.
- `bun run lint` — `eslint . --max-warnings=0`.
- `bun run test` — `vitest run --passWithNoTests`.

## Documentation

- [`docs/appendix-a-copilot-contract.md`](../../docs/appendix-a-copilot-contract.md) — the source-verified Copilot hook contract + viability verdict (read first).
- [`docs/02-architecture.md`](../../docs/02-architecture.md) — hook semantics across agents (Copilot `agentStop` vs Gemini `AfterAgent` vs Codex `Stop` vs Claude `PreToolUse`).
- [`docs/03-server-contract.md`](../../docs/03-server-contract.md) — the viewer HTTP surface the hook drives (unchanged by this integration).
- [`packages/symbiot-agent-runtime/README.md`](../../packages/symbiot-agent-runtime/README.md) — the shared `runPlanReview` spawn-and-decide loop.

## License

MIT — see the root [`LICENSE.md`](../../LICENSE.md).
