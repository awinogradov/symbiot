# @symbiot/opencode-plugin

OpenCode (`sst/opencode`, now `anomalyco/opencode`) integration for symbiot. Unlike the
Claude Code / Codex / Gemini / Copilot CLI hooks — which **block the turn** until the
reviewer decides — OpenCode loads plugins **in-process** and **drops** the promise
returned by the `session.idle` `event` handler, so the turn cannot be paused. This
integration ships a **scaffold + fire-and-forget workaround**: on `session.idle` it saves
the assistant's latest response to an inbox and opens the viewer; the reviewer's feedback
is delivered into the **next** turn as a prepended `[Reviewer feedback]: …` block.

> Full in-turn block-on-approve is **not implementable today** and is gated on upstream
> [`sst/opencode#16626`](https://github.com/sst/opencode/issues/16626). See
> [Known limitations](#known-limitations) for the spike result and the corrected status
> of [`#16879`](https://github.com/sst/opencode/issues/16879).

## Architecture

```
OpenCode host (in-process)
  │ event: session.idle   (the host DROPS this handler's promise — cannot block)
  ▼
SymbiotOpenCodePlugin.event
  │ client.session.messages → latest assistant text
  │ write ~/.symbiot/agents/opencode/inbox/<sessionID>.md
  ▼
@symbiot/viewer  startServer({ agentId: "opencode" })   (fire-and-forget; opens browser)
  │ reviewer approves → nothing  |  requests changes → feedback
  ▼
write ~/.symbiot/agents/opencode/pending/<sessionID>.json

  … next user turn …
OpenCode host
  │ chat.message   (awaited)
  ▼
SymbiotOpenCodePlugin["chat.message"]
  │ claim pending feedback (consume-once) → prepend "[Reviewer feedback]: …" part
  ▼
the model sees the feedback and steers the next turn
```

State persists under `~/.symbiot/agents/opencode/` — the per-agent namespace threaded
through `startServer({ agentId: "opencode" })` — so OpenCode never collides with the other
agents on a shared plan slug. `inbox/` and `pending/` are net-new subtrees this plugin
owns; the viewer still writes `history/` etc.

## Installation

OpenCode auto-loads plugins from its plugins directory. Register symbiot's loader:

```sh
bun --filter @symbiot/opencode-plugin install-plugin    # writes ~/.config/opencode/plugins/symbiot-opencode.ts
bun --filter @symbiot/opencode-plugin uninstall-plugin   # removes it
```

`install` writes a small loader at `~/.config/opencode/plugins/symbiot-opencode.ts` that
re-exports the plugin from this workspace's **source** `plugin.ts` (so its `@symbiot/viewer`
and embedded-viewer imports keep resolving from the repo). It is idempotent (byte-identical
re-write), atomic (tmp + rename), and carries a `@managed-by symbiot-opencode` sentinel so
`uninstall` only deletes a loader it owns — a hand-edited file is left in place with a
warning.

**Manual alternative** — add the package to your `opencode.json` instead of the loader:

```jsonc
{ "plugin": ["@symbiot/opencode-plugin"] }
```

## Example flow

1. Install the loader once (`install-plugin`).
2. OpenCode works on a task. When the agent goes idle, `session.idle` fires; the plugin
   saves the latest assistant response to `~/.symbiot/agents/opencode/inbox/<id>.md` and
   opens the viewer in your browser.
3. You **approve** → nothing is persisted; the next turn proceeds unchanged.
4. Or you **request changes** with markdown feedback → it is saved to
   `~/.symbiot/agents/opencode/pending/<id>.json`.
5. On your **next prompt**, the `chat.message` hook prepends `[Reviewer feedback]: <your
feedback>` to the message (consume-once) so OpenCode acts on it. The feedback is read
   from disk, so it survives an OpenCode restart between turns.

## Usage

Once the loader is installed, review is automatic: when an OpenCode session goes idle, the
viewer opens. The CLI can also annotate any markdown file outside the plugin flow (this
path blocks, like the other agents, because a human runs it and waits):

```sh
bun src/cli.ts annotate path/to/document.md
```

## Known limitations

- **No in-turn block — feedback lands on the _next_ turn.** OpenCode's only `session.idle`
  delivery is the `event` hook, and the host **does not await** it (`hook["event"]?.(…)` is
  fire-and-forget upstream). The plugin cannot stall the turn the way the CLI-hook agents
  do; it persists feedback and injects it via the awaited `chat.message` hook on the
  following turn.
- **Upstream status (re-verified 2026-05-31).**
  [`sst/opencode#16626`](https://github.com/sst/opencode/issues/16626) ("session.stopping
  hook to re-enter the loop") is **open** — the single live blocker for true
  block-on-approve. [`sst/opencode#16879`](https://github.com/sst/opencode/issues/16879)
  ("await plugin event handlers on session.idle") is **closed — as a duplicate of #16626,
  not implemented**; the proposed awaited `event.sync` hook does **not** exist in
  `@opencode-ai/plugin`. The spike found **no synchronous `BeforeIdle`-style predecessor**
  event either. When #16626 lands, a follow-up can swap this fire-and-forget proxy for the
  blocking `runPlanReview` loop the other agents use.
- **One review per session; abandoned reviews time out.** A fresh `session.idle` for a
  session already under review replaces the prior viewer. A review left open is stopped
  after one hour (the turn then proceeds with no feedback) so an ignored viewer never leaks
  a port.
- **Feedback written after the next turn started lands on the turn after that.** The pending
  file is claimed atomically (rename-to-claim) and consumed exactly once, so it is never
  double-injected; if it is not ready when a turn begins, it is delivered on the following
  one.
- **Runs in-process.** The plugin never calls `process.exit` and swallows its own errors (a
  failed review degrades to "no feedback") so a plugin fault cannot crash the host.

## Local development

```sh
bun run typecheck   # tsc --noEmit
bun run lint        # eslint . --max-warnings=0
bun run test        # vitest (plugin + storage + lastAssistantMessage + installPlugin units)
```

The viewer must be built first so the embedded `index.html.gz` resolves (Turborepo handles
this via `dependsOn: ["^build"]`):

```sh
bun --filter @symbiot/viewer build
```

### Scripts

- `bun run build` — bundle the CLI (`bun build src/cli.ts --target=bun --outdir dist`).
- `bun run install-plugin` / `uninstall-plugin` — register / remove the loader.
- `bun run annotate <file.md>` — manual annotate flow.
- `bun run typecheck` — `tsc --noEmit`.
- `bun run lint` — `eslint . --max-warnings=0`.
- `bun run test` — `vitest run --passWithNoTests`.

## Documentation

- [`docs/architecture.md`](../../docs/architecture.md) — hook semantics across agents (OpenCode `session.idle` fire-and-forget vs the blocking CLI hooks).
- [`docs/server-contract.md`](../../docs/server-contract.md) — the viewer HTTP surface the plugin drives (unchanged by this integration).
- [`packages/symbiot-agent-runtime/README.md`](../../packages/symbiot-agent-runtime/README.md) — the shared `runPlanReview` loop (used by the `annotate` CLI).

## License

MIT — see the root [`LICENSE.md`](../../LICENSE.md).
