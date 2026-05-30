# Architecture

How symbiot is composed, the package layering, the HTTP surface, and the
"architectural specials" — non-obvious decisions every contributor should
know before moving code around.

## System shape

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                          Claude Code (or any agent)                              │
└──────────────────────────────────────────────────────────────────────────────────┘
                                  │ PreToolUse(ExitPlanMode)
                                  ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  apps/claude-code  ── spawns ──▶  apps/viewer  ── opens browser  ──▶  Reviewer   │
│              CLI shim                  │                                         │
│                                        ▼                                         │
│                              ~/.symbiot/  (filesystem-only state)                │
│                              └── agents/<agent-id>/                              │
│                                  ├── history/<project>/<slug>/00N.md             │
│                                  ├── annotations/<project>/<slug>/               │
│                                  ├── drafts/<project>/<slug>/draft.json          │
│                                  └── uploads/<project>/<slug>/                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

All agent integrations spawn the same `apps/viewer` binary through the shared
`runPlanReview` loop in `@symbiot/agent-runtime`; they differ only in CLI shape
(`apps/claude-code`, future `apps/copilot`, `apps/gemini`, ...) — how
they parse stdin and emit their own decision JSON.

## Package layering

```
   apps/claude-code (Claude Code) · apps/codex (Codex CLI; future apps/gemini, apps/copilot, ...)
        │ depends on
        ▼
   @symbiot/agent-runtime   ──  runPlanReview: spawn → await → decide loop
        │ startServer / RunningServer
        ▼
   apps/viewer  (HTTP server + UI — the single binary every agent spawns)
        │
        ▼
   @symbiot/editor  ──▶  @symbiot/ui  ──▶  @symbiot/tailwind-config
        │
        ▼
   @symbiot/annotations          (no UI deps — tuple model + Plate shape)

   (shared tooling)
   @symbiot/eslint-config, /prettier-config, /typescript-config
```

One-way arrows. Every agent integration depends on `@symbiot/agent-runtime`,
which owns the spawn-and-decide loop and depends on `apps/viewer` only through
its `startServer` / `RunningServer` boundary. The editor consumes UI
primitives; UI never imports the editor. The annotation package has no UI
dependencies — it only knows about the tuple model and the Plate value shape
(typed locally to keep slate out of its dep surface).

## Server contract

`apps/viewer/src/shared/apiRoutes.ts` is the single source of truth for every
`/api/*` endpoint. Both the Bun dispatch table and the client `apiClient` key
into the same registry, so route paths and methods never drift.

| Method | Path                    | Purpose                                      |
| ------ | ----------------------- | -------------------------------------------- |
| GET    | `/api/plan`             | Plan markdown + viewer mode for the session. |
| GET    | `/api/plan/versions`    | Every persisted version + the current one.   |
| GET    | `/api/plan/version?n=N` | Markdown of a specific version.              |
| POST   | `/api/plan/vscode-diff` | Spawn `code --diff <from> <to>` on the host. |
| POST   | `/api/approve`          | Reviewer approved the plan.                  |
| POST   | `/api/deny`             | Reviewer denied with free-text feedback.     |
| POST   | `/api/feedback`         | Annotate-mode reviewer submitted feedback.   |
| GET    | `/api/draft`            | Resume an in-progress draft.                 |
| POST   | `/api/draft`            | Persist the draft (debounced).               |
| DELETE | `/api/draft`            | Clear the draft.                             |
| POST   | `/api/upload`           | Upload an image to the plan's uploads dir.   |
| GET    | `/api/image`            | Read back an uploaded image by UUID.         |

## Architectural specials

Decisions that are easy to break by accident. When a decision becomes
obsolete, delete the bullet rather than hedging it.

### Monorepo + tooling

- **Server logic + browser UI live together in `apps/viewer`.** No separate
  `packages/symbiot-server`. The Bun HTTP server (`src/server/`) and
  React/Vite client (`src/client/`) build into a single binary. Agent
  integrations spawn that one binary.
- **For Claude Code the hook event is `PreToolUse` with matcher `ExitPlanMode`** —
  NOT `Stop`. In Claude Code, `Stop` fires on every assistant turn;
  `PreToolUse(ExitPlanMode)` fires exactly when the agent presents a plan, which
  is the only clean point at which we can block with feedback. Decision: exit
  `0` to approve; `{"decision":"block","reason":"<feedback>"}` on stdout to
  request changes. (This is Claude-specific — Codex CLI has no
  `ExitPlanMode`/`update_plan` tool, so `apps/codex` gates on `Stop`; see the
  Codex bullet under **Hook semantics**.)
- **Hook command points at source `cli.ts`, never the bundle.** `bun build`
  inlines `@symbiot/viewer` into the bundle and rewrites `import.meta.url`,
  which breaks the viewer's relative path math to `dist/client/`. The
  installer writes `bun /abs/path/apps/claude-code/src/cli.ts run-hook`. Bun runs
  `.ts` directly, so no bundling is needed for the hook.
- **Tailwind v4 only scans the project root** (`apps/viewer`). Workspace
  package class names must be declared in the consumer's `styles.css` via
  `@source "<relative-path>";`. Every new workspace that emits Tailwind
  classes needs an `@source` line.

### React + Plate

- **Plate void elements need React 19 wrappers.** `HorizontalRulePlugin`
  ships `render: { as: "hr" }`. Slate-React always passes a zero-width text
  node as `children`; React 19 rejects children on void HTML elements. Fix:
  `.withComponent(HrElement)` where `HrElement` renders a div with `<hr/>`
  plus a hidden `<span>{children}</span>`. The same pattern is required for
  `<img>`, `<br>`, and any future void element.
- **Plate initial value must be a deserialized array, never a markdown
  string.** `usePlateEditor({ value: markdownString })` triggers
  `splitDecorationsByChild` on `undefined` because Slate's `useChildren`
  runs before the markdown auto-deserializer. Fix:
  `value: (e) => e.getApi(MarkdownPlugin).markdown.deserialize(markdown)`.
- **Selection toolbar is a custom DOM `selectionchange` listener**, not
  `@platejs/floating-toolbar`. Plate's FloatingToolbar doesn't fire on
  `contenteditable=false` content (Pattern A is read-only). Swap to Plate's
  once it ships read-only support.
- **`aboveNodes` render hooks return `children` for unchanged nodes, not
  `undefined`.** Returning `undefined` causes Plate to drop the element
  entirely from the rendered tree (the only thing rendered is the wrapper,
  which now produces nothing). The `DiffPlugin`'s `aboveNodes` returns
  `children` whenever the element doesn't carry a diff op.
- **Per-render-mode editors use the parent's `key` prop, not
  `usePlateEditor` deps.** `DiffEditor` is re-keyed by the host on `mode`
  change so a fresh Plate editor is constructed with the right initial
  `value`. Mixing `usePlateEditor`'s `deps` argument with conditional value
  computation produces stale renders.

### Storage + state

- **Storage is filesystem-only.** Everything persists under `~/.symbiot/`;
  there is no database (no Prisma / Kysely / Postgres / BetterAuth).
  Anything user-visible writes atomically (`writeFile` to `.tmp` + `rename`).
- **Per-agent namespacing.** Plan history, annotations, drafts, and uploads live
  under `~/.symbiot/agents/<agent-id>/` so multiple agents (Claude Code, Codex, …)
  never collide on a shared plan slug. `startServer({ agentId })` threads the slug
  (default `claude-code`) into `storage.ts`; on boot, `migrateLegacyTree` moves any
  pre-namespacing flat trees (`history`/`annotations`/`drafts`/`uploads`) into the
  `claude-code` namespace once (idempotent). The slug stays server-side — it never
  enters `PlanMeta`, the wire payload, or a URL. `~/.symbiot/hook-state/` is
  hook-global, not per-agent, and is left in place.
- **Plan-slug derivation uses the first H1.** `derivePlanSlug` slugifies the
  first markdown heading; `deriveProjectSlug` slugifies the cwd basename.
  Two markdown files with the same H1 share an on-disk history directory —
  this is by design (the diff smoke flow depends on it).
- **Annotation anchors are dual-mode.** `packages/symbiot-annotations`
  resolves anchors first by Plate path, then by text-quote match on
  `originalText`. The third state — `missing` — surfaces as
  `drifted: true` on the walker entry and renders the destructive
  `drifted` badge in the sidebar.
- **Drift detection is sidecar-driven, not codec-driven.** The walker
  receives two optional maps — `commentOriginalTexts` and
  `suggestionOriginalTexts` — and only invokes `resolveAnchor()` when
  they're supplied. `originalText` is captured at annotation creation
  (`applyComment.ts`, `applyDeletion.ts` already returned it; the values
  are now persisted) and threaded through `EditorSnapshot` →
  `DraftPayload` (optional fields for back-compat) → walker. Legacy
  drafts without the maps walk with no drift signal, so the draft wire
  format stays backward-compatible. The codec (C / G / D tuple
  serializer) never sees the drift flag — only the sidebar UI consumes
  it.

### Hook semantics

- **The spawn-and-decide loop lives once in `@symbiot/agent-runtime`.** The
  `runPlanReview` helper owns `startServer → onStart(url) → await resolved →
stop → onResolved`. Each agent injects only stdin parsing and decision
  emission via the `onResolved` callback (whose return value is the process
  exit code); Claude-specific glue — `emitApproveDecision` / `emitDenyDecision`,
  the approve marker, the `claude-code#50660` workaround — stays in
  `apps/claude-code/src/runHook.ts`. `@symbiot/viewer` (`startServer` /
  `RunningServer`) is the boundary; each agent passes its `agentId` through
  `serverOptions`, so per-agent storage namespacing stays a viewer concern
  (see Storage + state).
- **Two events under one matcher.** The installer registers
  `PreToolUse(ExitPlanMode)` AND `PermissionRequest(ExitPlanMode)` against the
  same `symbiot run-hook` command. `PreToolUse` drives the viewer (single
  reviewer prompt). On approve it writes a short-lived marker keyed by a
  SHA-256 of the plan to `~/.symbiot/hook-state/last-approve.json` and
  emits the documented `permissionDecision: "allow"` payload. On deny it
  emits the bulletproof top-level `{decision: "block", reason}` field —
  this short-circuits tool dispatch, so `PermissionRequest` does not fire
  on the deny path. `PermissionRequest` is a viewer-less reader that
  consults the marker (60 s TTL, plan-hash gated) and emits the nested
  `{decision: {behavior: "allow", updatedPermissions: [{type: "setMode",
mode: "auto", destination: "session"}]}}` schema Claude Code honors for
  this event — suppressing the native "Accept this plan?" prompt and, in its
  place, switching the session to `auto` mode (the prompt's "start in auto
  mode" choice) instead of Claude Code's post-approval `acceptEdits` default.
- **Two schemas — `PreToolUse` ≠ `PermissionRequest`.** The two events do
  NOT share an output shape. `PreToolUse` expects
  `hookSpecificOutput.permissionDecision` (`allow` / `deny` / `ask`) which
  Claude Code ignores for the `ExitPlanMode` matcher (upstream bug:
  [anthropics/claude-code#50660](https://github.com/anthropics/claude-code/issues/50660)).
  `PermissionRequest` expects the nested
  `hookSpecificOutput.decision.behavior` (`allow` / `deny`) — a different
  field at a different path — and IS honored for `ExitPlanMode`. That is
  why the second prompt actually disappears today. When the marker is
  missing or stale, `PermissionRequest` writes nothing so Claude Code
  falls through to its native prompt (graceful degradation).
- **Stop-on-deny is intentional.** The deny path stays on `PreToolUse`
  via `{decision: "block", reason}` because that field also blocks the
  tool dispatch entirely — no PermissionRequest, no re-prompt, no race.
- **Codex CLI gates on `Stop`, not `PreToolUse`.** Codex has no
  `ExitPlanMode`/`update_plan` tool, so `apps/codex` reviews the turn-final
  `last_assistant_message` on the `Stop` hook (installed in
  `~/.codex/hooks.json`). The decision contract is identical to Claude's deny
  path — `{"decision":"block","reason":<feedback>}` makes Codex continue the
  turn (request changes); no output + exit `0` lets it stop (approve). No
  approve-marker or `PermissionRequest` companion is needed — those are Claude
  `#50660` workarounds; Codex honors `decision:block` on `Stop` directly. A
  `stop_hook_active` guard limits review to one gate per stop-chain (a prior
  block already re-triggered the turn), and an unparseable payload degrades to a
  pass-through so the hook never spuriously blocks. The `Stop` stdin (subset)
  and decision shapes:

  ```jsonc
  // stdin — Codex Stop payload (other fields ignored)
  { "hook_event_name": "Stop", "last_assistant_message": "# Plan…", "stop_hook_active": false }
  // stdout — request changes (else: no output + exit 0 to approve)
  { "decision": "block", "reason": "<feedback>" }
  ```

  `agentId: "codex"` threads into per-agent storage (see **Storage + state**);
  this reuses `runPlanReview` and adds no `/api/*` route, so the server contract
  is unchanged.

### Sharing

- **Share codec lives in `@symbiot/annotations`.** The compact wire format
  (`AnnotationTuple[]`) is already the source of truth for feedback markdown;
  reusing it for share keeps a single tuple model. `share.ts` adds
  `serialize`/`deserialize` (deflate-raw + base64url) and `encrypt`/`decrypt`
  (AES-256-GCM, random 12-byte IV) on top of the existing tuples — it does
  NOT re-encode them.
- **`SymbiotDocument` is the share boundary, not the editor boundary.** The
  viewer keeps its own `EditorSnapshot` / `DraftPayload` shapes;
  `SymbiotDocument` (`{ markdown, value, annotations, globalComments, meta }`)
  is constructed only at share-export and validated at share-import. This
  prevents wire-format changes from rippling into authoring state.
- **Share keys live in the URL fragment, never on the wire.** The encrypted
  path is intended to put the 32-byte AES key in `#k=…` so the paste service
  (issue #46) only ever sees ciphertext. Losing the fragment means losing
  the document — by design.
- **Decoder-pinned goldens, not encoder.** `fixtures/golden/share-codec/`
  pins `{ encoded, decoded }` pairs because `deflate-raw` output is
  implementation-defined and shifts across zlib/Node/Bun versions. What
  matters for compatibility is that any historically valid encoded string
  still deserializes correctly. New `SymbiotDocument` shapes add new
  fixtures rather than editing existing ones.

### Testing harness

- **End-to-end tests are Playwright-BDD.** Features live in `features/` with
  one subdirectory per area (`plan-review/`, `markdown/`, `annotate/`,
  `server/`). Step helpers are **pure functions** — no module-level mutable
  scenario state. Selector rule (testids only, naming, placement) lives in
  [`testing.md` § Playwright-BDD selectors](./testing.md#playwright-bdd-selectors).
  Scenarios wait on selectors, assertions, or `waitForFunction` — never on
  `waitForTimeout`/`setTimeout`. Wall-clock waits flake under CI load and
  hide real regressions.
- **Vitest tests are co-located with sources.** `*.test.ts(x)` next to the
  module under test.

## Where to look next

- Product overview: [`./product.md`](./product.md).
- Per-package READMEs describe their surface; this doc is the cross-cutting
  layer above them.
- When new work surfaces an architectural decision worth preserving, append
  it to **Architectural specials** above — describe what the rule is and
  what breaks if you ignore it. When a decision is obsoleted, delete it.
