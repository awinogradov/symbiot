# Adding a new agent integration

How to add a new agent (e.g. a future CLI or IDE assistant) to symbiot. Every
integration drives the same review loop — spawn the viewer, block on a human
decision, map that decision back to the host — so a new agent is mostly a thin
wrapper that supplies what genuinely differs. Read
[`02-architecture.md` § Hook semantics](./02-architecture.md#hook-semantics) first;
it explains why each existing agent gates on the event it does.

## The shape of an integration

```
host agent ── hook/plugin ──▶ apps/<agent>/src/run-hook
                                   │ parse stdin → plan
                                   ▼
                 @symbiot/agent-runtime runPlanReview()
                                   │ spawn viewer, block on decision
                                   ▼
                 apps/viewer (HTTP server + UI) ──▶ reviewer
                                   │ approve / request changes
                                   ▼
                 emit the host's decision JSON → host
```

There are two integration styles:

- **stdin-driven CLI hook** (`codex`, `gemini`, `copilot`, `claude-code`) — the
  host fires a hook, pipes JSON on stdin, and reads a decision from stdout. This
  is the common case and the one this guide walks through.
- **in-process plugin** (`opencode-plugin`) — the host loads symbiot in-process
  and delivers events fire-and-forget; it cannot block the turn. Follow
  `apps/opencode-plugin` as the template instead of the steps below.

## Shared building blocks

`@symbiot/agent-runtime` owns everything that is identical across agents. Import
from the actual subpath (never a barrel):

| Import                                    | What it gives you                                                                  | Used by                  |
| ----------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------ |
| `@symbiot/agent-runtime`                  | `runPlanReview` — the spawn → await → decide loop                                  | all                      |
| `@symbiot/agent-runtime/cli`              | `createCli` — dispatcher shell (usage/exit-64, error→exit-1)                       | all                      |
| `@symbiot/agent-runtime/annotate`         | `runAnnotate` — the shared `annotate <file.md>` flow                               | all                      |
| `@symbiot/agent-runtime/draft`            | `runDraft` — the shared `draft [file.md] [--slug]` flow + marker constants         | claude-code              |
| `@symbiot/agent-runtime/hook-input`       | `readHookInput`, `flagValue`, `parsePort`, `createStopPlanExtractor`               | stdin hooks              |
| `@symbiot/agent-runtime/decision`         | `emitBlockDecision`, `emitDecision` — the `{"decision":"block","reason"}` contract | stdin hooks              |
| `@symbiot/agent-runtime/config-installer` | `createConfigHookInstaller` — merge a hook into a shared JSON settings file        | codex/gemini/claude-code |
| `@symbiot/agent-runtime/managed-file`     | `writeAtomic`, `removeIfOwned` — atomic write + ownership sentinel                 | copilot/opencode         |
| `@symbiot/agent-runtime/marker-store`     | `createMarkerStore` — TTL re-entrancy markers under `~/.symbiot/hook-state/`       | copilot                  |

Keep per-agent only what genuinely differs from every other agent — copilot's
transcript tail-read, opencode's in-process plugin model, and claude-code's
two-event approve-marker flow are deliberately local for that reason.

## Steps (stdin-driven CLI hook)

Use `apps/codex` as the minimal template — it is the smallest complete example.

1. **Scaffold `apps/<agent>/`.** Copy `package.json`, `vitest.config.ts`, and
   `tsconfig.json` from `apps/codex`, renaming `@symbiot/codex` →
   `@symbiot/<agent>` and the `install-hook`/`run-hook` script bodies. Depend on
   `@symbiot/agent-runtime` and `@symbiot/viewer` (`workspace:*`). Pin exact
   versions (no `^`/`~`).

2. **`installHook.ts`** — pick the installer strategy that matches the host:
   - Host merges hooks into one shared settings file → `createConfigHookInstaller`
     with the file `path`, the `registerEvents`, an optional `matcher`, optional
     `cleanEvents` (legacy entries to strip), and `entryExtras` for the host's
     `name`/`timeout` (mind the unit — Codex uses seconds, Gemini milliseconds).
     Supply `cliCommand` from this app's own `import.meta.url` so the installed
     command resolves to `apps/<agent>/src/cli.ts` (never the bundle — that keeps
     the embedded viewer's `dist/client/` path math intact).
   - Host loads hooks from a directory of dedicated files → write your own file
     with `writeAtomic` + an ownership sentinel, and uninstall via `removeIfOwned`
     (see `apps/copilot/src/installHook.ts`).

3. **`runHook.ts`** — read stdin with `readHookInput`, extract the plan
   (`createStopPlanExtractor({ eventName, messageField })` for a single-event
   hook, or a custom parser), then call `runPlanReview` passing the embedded
   `viewerHtmlGz`, your `agentId`, and `onResolved: emitDecision`. The `--port` /
   `--no-open` flags (`flagValue`/`parsePort`) keep the headless E2E harness able
   to drive the viewer.

4. **`runAnnotate.ts`** — a one-line binding over `runAnnotate` from
   `@symbiot/agent-runtime/annotate`, passing `binName`, `agentId`, and the
   embedded `viewerHtmlGz`. The `viewerHtmlGz` import must live in the app (it is
   embedded into the compiled binary), so it is passed in rather than imported by
   the shared helper.

5. **`cli.ts`** — `createCli({ binName, usageCommands, handlers }).run(process.argv.slice(2))`.
   Handlers receive the argv tail; the install/uninstall stdout messages are the
   only per-agent text left here.

6. **Tests.** The shared emit/extractor/installer/marker logic is already covered
   in `packages/symbiot-agent-runtime/src/*.test.ts` — do not re-test it per app.
   Add only what is unique to your agent: the installer round-trip against a temp
   `HOME` (see `apps/codex/src/installHook.test.ts`) and any custom stdin parsing
   or transcript handling. Coverage for `packages/symbiot-*` is gated at 90% by
   the root `vitest.config.ts`; `apps/**` is unit-excluded (see
   [`08-testing.md`](./08-testing.md)).

7. **Docs.** Add `apps/<agent>/README.md` with an `## Architecture` ASCII diagram
   and a `## Schemas` section pinning the stdin/decision shapes (match the
   existing app READMEs). Then register the integration in:
   - [`README.md`](./README.md) (this docs index — the per-area README list),
   - the root `README.md` Project Structure + Documentation sections,
   - a new **Hook semantics** bullet in [`02-architecture.md`](./02-architecture.md)
     describing the event you gate on and why.

## The decision contract

Every stdin hook maps the reviewer's decision identically (this is what
`@symbiot/agent-runtime/decision` emits):

```jsonc
// request changes — the host runs another turn with `reason` as the prompt
{ "decision": "block", "reason": "<feedback>" }
// approve — no stdout, exit 0
```

Claude Code's _approve_ path is the exception (it emits a `permissionDecision`
allow payload to suppress the native prompt); see
`apps/claude-code/src/runHook.ts`. If your host needs a bespoke approve payload,
keep that emission local and reuse `emitBlockDecision` for the deny path only.

## See also

- [`02-architecture.md`](./02-architecture.md) — package layering and the per-agent hook-semantics rationale.
- [`../packages/symbiot-agent-runtime/README.md`](../packages/symbiot-agent-runtime/README.md) — the shared helpers in detail.
- [`appendix-a-copilot-contract.md`](./appendix-a-copilot-contract.md) — a worked example of auditing an undocumented host hook contract before integrating.
