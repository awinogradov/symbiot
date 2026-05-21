# Architecture

How symbiot is composed, the package layering, the HTTP surface, and the
"architectural specials" — non-obvious decisions every contributor should
know before moving code around. Status and scope live in
[`../plans/README.md`](../plans/README.md); this doc is timeless reference.

## System shape

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          Claude Code (or any agent)                       │
└───────────────────────────────────────────────────────────────────────────┘
                                  │ PreToolUse(ExitPlanMode)
                                  ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  apps/hook  ── spawns ──▶  apps/viewer  ── opens browser  ──▶  Reviewer    │
│              CLI shim                  │                                  │
│                                        ▼                                  │
│                              ~/.symbiot/  (filesystem-only state)         │
│                              ├── history/<project>/<slug>/00N.md          │
│                              ├── annotations/<project>/<slug>/            │
│                              ├── drafts/<project>/<slug>/draft.json       │
│                              └── uploads/<project>/<slug>/                │
└───────────────────────────────────────────────────────────────────────────┘
```

All agent integrations spawn the same `apps/viewer` binary; they differ only
in CLI shape (`apps/hook` for Claude Code, future `apps/copilot`,
`apps/gemini`, ...).

## Package layering

```
            ┌─ apps/viewer ─────────────────────────────────┐
            │   apps/hook (spawns viewer)                    │
            │                                                │
            ▼                                                │
   @symbiot/editor  ──────▶  @symbiot/ui  ──▶  @symbiot/tailwind-config
            │                                                │
            ▼                                                │
   @symbiot/annotations                                      │
                                                             │
                          (shared)                           │
   @symbiot/eslint-config, /prettier-config, /typescript-config
```

One-way arrows. The editor consumes UI primitives; UI never imports the
editor. The annotation package has no UI dependencies — it only knows about
the tuple model and the Plate value shape (typed locally to keep slate out of
its dep surface).

## Server contract

`apps/viewer/src/shared/apiRoutes.ts` is the single source of truth for every
`/api/*` endpoint. Both the Bun dispatch table and the client `apiClient` key
into the same registry, so route paths and methods never drift.

| Method | Path                    | Purpose                                      |
| ------ | ----------------------- | -------------------------------------------- |
| GET    | `/api/plan`             | Plan markdown + viewer mode for the session. |
| GET    | `/api/plan/versions`    | Every persisted version + the current one.   |
| GET    | `/api/plan/version?n=N` | Markdown of a specific version.              |
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
- **Hook event is `PreToolUse` with matcher `ExitPlanMode`** — NOT `Stop`.
  `Stop` fires on every assistant turn; `PreToolUse(ExitPlanMode)` fires
  exactly when the agent presents a plan, which is the only clean point at
  which we can block with feedback. Decision: exit `0` to approve;
  `{"decision":"block","reason":"<feedback>"}` on stdout to request changes.
- **Hook command points at source `cli.ts`, never the bundle.** `bun build`
  inlines `@symbiot/viewer` into the bundle and rewrites `import.meta.url`,
  which breaks the viewer's relative path math to `dist/client/`. The
  installer writes `bun /abs/path/apps/hook/src/cli.ts run-hook`. Bun runs
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
- **Plan-slug derivation uses the first H1.** `derivePlanSlug` slugifies the
  first markdown heading; `deriveProjectSlug` slugifies the cwd basename.
  Two markdown files with the same H1 share an on-disk history directory —
  this is by design (the diff smoke flow depends on it).
- **Annotation anchors are dual-mode.** `packages/symbiot-annotations`
  resolves anchors first by Plate path, then by text-quote match on
  `originalText`. The third state — `missing` — is the hook for drift
  surfacing.

### Hook semantics

- **Approve sends both shapes.** `apps/hook` emits the documented
  `permissionDecision: "allow"` payload, but Claude Code currently ignores
  that for the `ExitPlanMode` matcher (upstream bug:
  [anthropics/claude-code#50660](https://github.com/anthropics/claude-code/issues/50660)).
  The Request-changes path is unaffected. The auto-approve payload will
  start working transparently when the upstream fix lands.

### Testing harness

- **End-to-end tests are Playwright-BDD.** Features live in `features/` with
  one subdirectory per area (`plan-review/`, `markdown/`, `annotate/`,
  `server/`). Step helpers are **pure functions** — no module-level mutable
  scenario state. Selectors are `data-testid="<kebab-case>"` exclusively;
  never class names or text content.
- **Vitest tests are co-located with sources.** `*.test.ts(x)` next to the
  module under test.

## Where to look next

- Phase ledger (status, scope, goals): [`../plans/README.md`](../plans/README.md).
- Per-package READMEs describe their surface; this doc is the cross-cutting
  layer above them.
- When new work surfaces an architectural decision worth preserving, append
  it to **Architectural specials** above — describe what the rule is and
  what breaks if you ignore it. When a decision is obsoleted, delete it.
