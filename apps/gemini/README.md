# @symbiot/gemini

Gemini CLI integration for symbiot. Installs a Gemini `AfterAgent` hook that
intercepts the model's turn-final response, forwards it to the symbiot viewer
for review, and returns a Gemini-shaped decision — approve to let the turn end,
or request changes to send markdown feedback back and make Gemini retry the
turn.

This is the third agent integration after `apps/claude-code` (Claude Code) and
`apps/codex` (Codex CLI). It exists to keep proving the symbiot server contract
is genuinely agent-agnostic: Gemini's `AfterAgent` hook accepts the exact
`{"decision":"block","reason"}` shape Claude Code and Codex already consume, so
the agent-specific code here is a thin stdin parser + decision emitter wrapping
the shared `@symbiot/agent-runtime` loop.

## Architecture

```
Gemini CLI
  │ AfterAgent hook  (~/.gemini/settings.json)
  ▼
symbiot-gemini run-hook
  │ parse AfterAgent stdin → prompt_response
  ▼
@symbiot/agent-runtime  runPlanReview({ agentId: "gemini" })
  │ spawns the embedded viewer
  ▼
apps/viewer  (HTTP server + UI)
  │ reviewer approves / requests changes
  ▼
decision → stdout
  • approve        → no output, exit 0   (Gemini accepts the response, turn ends)
  • request changes → {"decision":"block","reason":<feedback>}  (Gemini retries the turn)
```

Plan history, annotations, drafts, and uploads persist under
`~/.symbiot/agents/gemini/` — the per-agent storage namespace threaded through
`startServer({ agentId: "gemini" })`, so Gemini never collides with Claude Code
or Codex on a shared plan slug.

## Installation

**End users (no clone, no Bun)** — download the verified binary and wire the hook:

```sh
curl -fsSL https://raw.githubusercontent.com/awinogradov/symbiot/main/scripts/install.sh | bash -s -- --agent gemini
# Windows (PowerShell):
# & ([scriptblock]::Create((irm https://raw.githubusercontent.com/awinogradov/symbiot/main/scripts/install.ps1))) -Agent gemini
```

This installs `symbiot-gemini` to `~/.local/bin` (verified against the release
`SHA256SUMS`) and runs its `install-hook`. (Contributors with a clone can instead
install the bundled Gemini extension: `gemini extensions install ./apps/gemini/extension`.)

**Contributors (from a clone)**:

```sh
bun --filter @symbiot/gemini install-hook    # writes the AfterAgent hook to ~/.gemini/settings.json
bun --filter @symbiot/gemini uninstall-hook   # removes it
```

`install-hook` is idempotent — it strips any prior symbiot-gemini entry before
writing the current command. From a clone it points at the source `cli.ts` (not a
bundle) so the embedded viewer's relative `dist/client/` path math stays intact;
the compiled binary emits the bare `symbiot-gemini run-hook` instead. It touches
only `~/.gemini/settings.json` (the Claude Code and Codex installers own their own
configs; the three never interfere).

## Usage

Once installed, the hook is automatic: when a Gemini turn ends, the viewer opens
in your browser. Approve to let the turn finish, or Request changes to send
markdown feedback that Gemini acts on in a retry turn.

The CLI can also annotate any markdown file outside the hook flow:

```sh
bun src/cli.ts annotate path/to/document.md
```

> One review per retry-chain: when the reviewer requests changes, Gemini revises
> and runs the `AfterAgent` hook again with `stop_hook_active: true`; that
> follow-up pass-through is un-gated to avoid an infinite review loop.

## Schemas

`run-hook` reads this deliberate subset of Gemini's `AfterAgent` hook stdin
payload (other Gemini fields — `prompt`, `session_id`, `cwd`, `transcript_path`,
`timestamp`, … — ride along ignored):

```ts
interface GeminiAfterAgentInput {
  hook_event_name?: string; // gated on "AfterAgent"
  prompt_response?: string; // the model's final response, reviewed as the plan
  stop_hook_active?: boolean; // true → pass through (retry-loop guard)
}
```

```json
{
  "hook_event_name": "AfterAgent",
  "prompt_response": "# Plan\n\n…",
  "stop_hook_active": false
}
```

Decision emitted to stdout:

```jsonc
// request changes — Gemini rejects the response and retries the turn with this feedback as the correction prompt
{ "decision": "block", "reason": "<feedback markdown>" }
// approve — no stdout, exit 0; Gemini accepts the response and the turn ends
```

> Gemini's hooks reference spells the blocking decision `"deny"` and treats
> `"block"` as an alias (both force the retry). symbiot emits `"block"` so the
> payload is byte-identical to `apps/claude-code` and `apps/codex`.

Config `install-hook` writes to `~/.gemini/settings.json`. **Gemini hook
`timeout` is in milliseconds** (default `60000`) — so the value below is one
hour. This is the one field that differs in unit from Codex/Claude, which
measure `timeout` in seconds; `run-hook` blocks while a human reviews, hence the
long value:

```json
{
  "hooks": {
    "AfterAgent": [
      {
        "hooks": [
          {
            "type": "command",
            "name": "symbiot-gemini",
            "command": "bun /abs/path/apps/gemini/src/cli.ts run-hook",
            "timeout": 3600000
          }
        ]
      }
    ]
  }
}
```

A malformed or unparseable payload degrades to a pass-through (no output, exit 0) — an `AfterAgent` hook must never emit a spurious retry.

## Migrating to Antigravity

On **2026-06-18** Google folds the consumer Gemini CLI into the Antigravity CLI:
Gemini CLI and the Gemini Code Assist IDE extensions stop serving Google AI Pro,
Ultra, and free Gemini Code Assist requests on that date (paid Gemini /
enterprise API-key access continues). Antigravity CLI preserves the primitives
symbiot relies on — **Hooks** and **Extensions** (rebranded as Antigravity
plugins).

This workspace ships a **dormant** plugin scaffold under
[`extension/`](./extension) so the cutover is a one-command switch rather than a
rewrite:

- [`extension/gemini-extension.json`](./extension/gemini-extension.json) — the
  plugin manifest (name `symbiot-gemini`).
- [`extension/hooks/hooks.json`](./extension/hooks/hooks.json) — the hook wiring,
  gated `"enabled": false`. It targets Antigravity's turn-end event (currently
  documented as `Stop`; the final name is TBD until GA) and, per Antigravity's
  schema, its `timeout` is in **seconds** (`3600`) — not the milliseconds Gemini
  CLI's `settings.json` uses.

When Antigravity GA's, activation is: flip `enabled` to `true`, install the
plugin (`gemini extensions install ./extension` or copy it under
`~/.gemini/extensions/symbiot-gemini`), and rename the storage namespace from
`agentId: "gemini"` to `"antigravity"`. Live wiring against the GA surface is
out of scope here — it is gated on Google's release and tracked against this
workspace.

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

- [`docs/02-architecture.md`](../../docs/02-architecture.md) — hook semantics across agents (Gemini `AfterAgent` vs Codex `Stop` vs Claude `PreToolUse`).
- [`docs/03-server-contract.md`](../../docs/03-server-contract.md) — the viewer HTTP surface the hook drives (unchanged by this integration).
- [`packages/symbiot-agent-runtime/README.md`](../../packages/symbiot-agent-runtime/README.md) — the shared `runPlanReview` spawn-and-decide loop.

## License

MIT — see the root [`LICENSE.md`](../../LICENSE.md).
