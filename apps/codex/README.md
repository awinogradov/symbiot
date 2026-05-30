# @symbiot/codex

Codex CLI integration for symbiot. Installs a Codex `Stop` hook that intercepts
the assistant's turn-final message, forwards it to the symbiot viewer for
review, and returns a Codex-shaped decision — approve to let the turn end, or
request changes to send markdown feedback back and keep Codex working.

This is the second agent integration after `apps/hook` (Claude Code). It exists
to prove the symbiot server contract is genuinely agent-agnostic: Codex's `Stop`
hook accepts the exact `{"decision":"block","reason"}` shape Claude Code already
consumes, so the agent-specific code here is a thin stdin parser + decision
emitter wrapping the shared `@symbiot/agent-runtime` loop.

## Architecture

```
Codex CLI
  │ Stop hook  (~/.codex/hooks.json)
  ▼
symbiot-codex run-hook
  │ parse Stop stdin → last_assistant_message
  ▼
@symbiot/agent-runtime  runPlanReview({ agentId: "codex" })
  │ spawns the embedded viewer
  ▼
apps/viewer  (HTTP server + UI)
  │ reviewer approves / requests changes
  ▼
decision → stdout
  • approve        → no output, exit 0   (Codex stops normally)
  • request changes → {"decision":"block","reason":<feedback>}  (Codex keeps going)
```

Plan history, annotations, drafts, and uploads persist under
`~/.symbiot/agents/codex/` — the per-agent storage namespace threaded through
`startServer({ agentId: "codex" })`, so Codex never collides with Claude Code on
a shared plan slug.

## Installation

```sh
bun --filter @symbiot/codex install-hook    # writes the Stop hook to ~/.codex/hooks.json
bun --filter @symbiot/codex uninstall-hook   # removes it
```

`install-hook` is idempotent — it strips any prior symbiot-codex entry before
writing the current absolute-path command. It points at the source `cli.ts` (not
a bundle) so the embedded viewer's relative `dist/client/` path math stays
intact, and touches only `~/.codex/hooks.json` (the Claude Code installer owns
`~/.claude/settings.json`; the two never interfere).

## Usage

Once installed, the hook is automatic: when a Codex turn ends, the viewer opens
in your browser. Approve to let the turn finish, or Request changes to send
markdown feedback that Codex acts on.

The CLI can also annotate any markdown file outside the hook flow:

```sh
bun src/cli.ts annotate path/to/document.md
```

> One review per stop-chain: when the reviewer requests changes, Codex revises
> and stops again with `stop_hook_active: true`; that follow-up stop passes
> through un-gated to avoid an infinite review loop.

## Schemas

`run-hook` reads this subset of Codex's `Stop` hook stdin payload (other Codex
fields — `session_id`, `cwd`, `permission_mode`, `model`, … — are ignored):

```ts
interface CodexStopInput {
  hook_event_name?: string; // gated on "Stop"
  last_assistant_message?: string; // reviewed as the plan
  stop_hook_active?: boolean; // true → pass through (loop guard)
}
```

```json
{
  "hook_event_name": "Stop",
  "last_assistant_message": "# Plan\n\n…",
  "stop_hook_active": false
}
```

Decision emitted to stdout:

```jsonc
// request changes — Codex continues the turn with this feedback
{ "decision": "block", "reason": "<feedback markdown>" }
// approve — no stdout, exit 0; Codex stops normally
```

Config `install-hook` writes to `~/.codex/hooks.json` (`timeout` is in seconds —
`run-hook` blocks while a human reviews):

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun /abs/path/apps/codex/src/cli.ts run-hook",
            "timeout": 3600
          }
        ]
      }
    ]
  }
}
```

A malformed or unparseable payload degrades to a pass-through (no output, exit 0) — a `Stop` hook must never emit a spurious block.

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

- [`docs/architecture.md`](../../docs/architecture.md) — hook semantics across agents (Codex `Stop` vs Claude `PreToolUse`).
- [`docs/server-contract.md`](../../docs/server-contract.md) — the viewer HTTP surface the hook drives (unchanged by this integration).
- [`packages/symbiot-agent-runtime/README.md`](../../packages/symbiot-agent-runtime/README.md) — the shared `runPlanReview` spawn-and-decide loop.

## License

MIT — see the root [`LICENSE.md`](../../LICENSE.md).
