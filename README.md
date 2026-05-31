# Symbiot

Review and annotate the plans your AI coding agents produce, then send structured feedback back. Symbiot intercepts a plan at the moment the agent presents it, opens a browser editor where you can comment, delete, insert, and replace passages with full markdown fidelity, and returns the resolved feedback as markdown the agent can act on.

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│       Claude Code · Codex · Gemini · OpenCode · Copilot CLI      │
└─────────────────────────────┬────────────────────────────────────┘
                              │ PreToolUse(ExitPlanMode)
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ apps/claude-code                                                 │
│   intercepts plan → persists to ~/.symbiot/agents/<agent-id>/... │
│   spawns apps/viewer on a free port, opens the browser           │
└─────────────────────────────┬────────────────────────────────────┘
                              │ HTTP /api/plan, /api/feedback, ...
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ apps/viewer                                                      │
│   Bun server  ──  React 19 + Vite client                         │
│                                                                  │
│      packages/symbiot-editor   ← PlateJS, markdown round-trip    │
│      packages/symbiot-ui       ← shadcn/ui shell + ThemeProvider │
│      packages/symbiot-annotations ← walk · serialize · codec     │
│      packages/tailwind-config  ← design tokens                   │
└──────────────────────────────────────────────────────────────────┘
```

`apps/portal` is the static share-viewer; it consumes the same `symbiot-editor` + `symbiot-ui` packages but reads serialized state from a URL fragment instead of the local server.

## Tech stack

- Bun — package manager and runtime
- Turborepo — task graph and caching
- TypeScript
- React 19 + Vite
- Tailwind v4
- shadcn/ui (Radix primitives)
- PlateJS — editor core
- Vitest — unit tests
- Playwright-BDD — end-to-end tests
- Filesystem-only storage under `~/.symbiot/` (no database)

## Install (Claude Code plugin)

```
/plugin marketplace add awinogradov/symbiot
/plugin install symbiot
```

Claude Code clones the repo and registers three hooks: `SessionStart`
(pre-warms the binary cache), `PreToolUse(ExitPlanMode)`, and
`PermissionRequest(ExitPlanMode)`. The first session after install
downloads a ~60 MB platform binary into `${CLAUDE_PLUGIN_DATA}/bin/`
(verified by SHA256 against the manifest shipped with the plugin).
This cold download takes ~44 s on a normal connection; `SessionStart`
pre-warms it so your first plan review opens instantly. Subsequent
sessions exec the cached binary directly — no Bun, no Node, no other
runtime required.

The `ExitPlanMode` hooks carry a 1-hour timeout because `run-hook`
blocks while you review the plan in the viewer — take as long as you
need to decide. One caveat: `/reload-plugins` updates the plugin
**without** re-firing `SessionStart`, so a freshly updated binary is not
pre-warmed until your next session, and the first plan review afterward
may incur a (now survivable) cold download.

Supported platforms: **macOS arm64**, **macOS x64**, **Linux x64**,
**Windows x64**. See [`docs/release.md`](docs/release.md) for the
release flow and the offline-install path.

## Prerequisites

- Bun `1.3.9` (pinned in the root `package.json` `packageManager` field). Bun is both the runtime and the package manager — no Node install is needed.

## Quick start (development)

```sh
bun install
bun run dev      # Vite + servers across workspaces via Turbo
bun run build    # builds every workspace
```

Smoke-run the viewer against a sample document:

```sh
bun run viewer:smoke
# or, explicitly:
bun --filter @symbiot/viewer start --plan fixtures/markdown/elements.md
```

For contributors who want to wire the dev tree into `~/.claude/settings.json`
without packaging the plugin, the legacy installer still works:

```sh
bun run hook:install     # writes settings.json entries pointing at apps/claude-code/src/cli.ts
bun run hook:uninstall   # removes them
```

## Auto-approve

Reviewer Approve in the viewer auto-confirms the plan in Claude Code —
no second "Accept this plan?" prompt. The installer registers two
hooks under the `ExitPlanMode` matcher:

- `PreToolUse(ExitPlanMode)` drives the viewer, persists the approval
  verdict to `~/.symbiot/hook-state/last-approve.json`, and emits the
  documented `permissionDecision: "allow"` payload.
- `PermissionRequest(ExitPlanMode)` reads that marker and, on a
  plan-hash + freshness match, emits the nested
  `{decision: {behavior: "allow"}}` schema that Claude Code honors for
  this event — suppressing the native prompt.

If the marker is stale, missing, or for a different plan, the
PermissionRequest hook writes nothing and Claude Code falls through to
its native prompt — graceful degradation. Request-changes (deny) is
routed via the bulletproof `{decision: "block", reason}` field on
`PreToolUse` and is unaffected by either schema.

Background and the upstream PreToolUse bug are tracked in
[symbiot#1](https://github.com/awinogradov/symbiot/issues/1) /
[anthropics/claude-code#50660](https://github.com/anthropics/claude-code/issues/50660).

## Local testing

```sh
bun run typecheck        # tsc across the workspace graph
bun run lint             # eslint
bun run lint:fix         # eslint --fix
bun run test             # Vitest
bun run format:check     # prettier
bun run build            # final gate
bun run licenses:audit   # third-party license report (see LICENSES.md)
```

End-to-end (Playwright-BDD, headless Chromium):

```sh
bun run test:e2e         # bddgen + playwright test
bun run test:e2e:ui      # interactive debugger
STORY=@UC1 bun run test:e2e:story   # one story/persona (tag expression via STORY)
```

First run needs Chromium installed locally:

```sh
SYMBIOT_INSTALL_BROWSER=1 bunx playwright install chromium
```

Conventions and selector rules for scenarios live in [`features`](./features/README.md).

## Project structure

```
apps/
  viewer/        Bun HTTP server + React/Vite client; ships as a single binary
  claude-code/   Claude Code hook that opens the viewer and resolves plans
  codex/         Codex CLI hook (Stop) that opens the viewer and resolves plans
  gemini/        Gemini CLI hook (AfterAgent) that opens the viewer and resolves plans
  copilot/       Copilot CLI hook (agentStop) that opens the viewer and resolves plans
  opencode-plugin/  OpenCode in-process plugin (session.idle); opens the viewer, steers the next turn
  portal/        Static viewer for shared review links
packages/
  symbiot-annotations/  Annotation tuple model + codec
  symbiot-editor/       PlateJS editor as a reusable React package
  symbiot-ui/           shadcn/ui components + ThemeProvider + chrome
  eslint-config/        Shared flat ESLint 10 config
  prettier-config/      Shared Prettier config
  tailwind-config/      Tailwind v4 tokens (semantic + annotation)
  typescript-config/    tsconfig presets (base / react / node)
docs/            Cross-cutting architecture, product, and contract docs
features/        Playwright-BDD scenarios and step helpers
fixtures/        Sample markdown + golden serializer fixtures
CLAUDE.md        Codebase conventions for humans and AI assistants
```

## Documentation

Read this list before touching the code — it's the documentation index CLAUDE.md points contributors at.

- [`CLAUDE.md`](./CLAUDE.md) — core principles, naming, lint/style rules, post-task checks.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — branch, commit, and PR conventions.
- [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) — community standards.
- [`LICENSES.md`](./LICENSES.md) — third-party license manifest (distinct from `LICENSE.md`).
- [`docs`](./docs/README.md) — cross-cutting architecture, product, and contract docs. Start here when a change spans more than one package.
- [`docs/product.md`](./docs/product.md) — product goals, non-goals, personas, principles, NFRs, success metrics.
- [`docs/architecture.md`](./docs/architecture.md) — app composition, package layering, HTTP surface, monorepo invariants, and the architectural specials.
- [`docs/agents/adding-an-integration.md`](./docs/agents/adding-an-integration.md) — how to add a new agent integration: the shared `@symbiot/agent-runtime` building blocks and a step-by-step.
- [`docs/server-contract.md`](./docs/server-contract.md) — HTTP surface between the hook and the viewer.
- [`docs/theming.md`](./docs/theming.md) — annotation color tokens (OKLCH values, hex equivalents, WCAG contrast methodology).
- [`docs/a11y.md`](./docs/a11y.md) — WCAG AA baseline: axe-core scenarios, keyboard nav checklist, focus-ring policy, ARIA-label inventory, screen-reader smoke.
- [`docs/version-history.md`](./docs/version-history.md) — on-disk version layout, `/api/plan/version[s]` endpoints, History tab, diff overlays.
- [`docs/release.md`](./docs/release.md) — release pipeline + shim/binary contract; cut and roll back releases here.
- [`docs/perf.md`](./docs/perf.md) — performance budget, bundle visualizer + Lighthouse reproduction.
- [`features`](./features/README.md) — Playwright-BDD layout, selector conventions, how to add a scenario.
- [`fixtures/markdown`](./fixtures/markdown/README.md) — sample markdown fixtures + the inline-diff smoke flow.
- [`fixtures/golden`](./fixtures/golden/README.md) — byte-equality regression fixtures for the annotation serializer.

Apps:

- [`apps/viewer`](./apps/viewer/README.md) — fullstack viewer (server + client).
- [`apps/claude-code`](./apps/claude-code/README.md) — Claude Code hook entry point.
- [`apps/codex`](./apps/codex/README.md) — Codex CLI hook entry point.
- [`apps/gemini`](./apps/gemini/README.md) — Gemini CLI hook entry point.
- [`apps/copilot`](./apps/copilot/README.md) — Copilot CLI hook entry point.
- [`apps/opencode-plugin`](./apps/opencode-plugin/README.md) — OpenCode in-process plugin entry point.
- [`apps/portal`](./apps/portal/README.md) — shared-link viewer.

Packages:

- [`packages/symbiot-agent-runtime`](./packages/symbiot-agent-runtime/README.md) — shared spawn-and-decide loop (`runPlanReview`) for agent integrations.
- [`packages/symbiot-annotations`](./packages/symbiot-annotations/README.md) — annotation tuples + codec.
- [`packages/symbiot-editor`](./packages/symbiot-editor/README.md) — Plate editor package, kits, modes.
- [`packages/symbiot-ui`](./packages/symbiot-ui/README.md) — shared UI primitives.
- [`packages/eslint-config`](./packages/eslint-config/README.md) — ESLint rulesets and `configure()`.
- [`packages/prettier-config`](./packages/prettier-config/README.md) — Prettier settings.
- [`packages/tailwind-config`](./packages/tailwind-config/README.md) — design tokens and annotation hues.
- [`packages/typescript-config`](./packages/typescript-config/README.md) — tsconfig presets.

## Contributing

Before opening a PR, read [`CONTRIBUTING.md`](./CONTRIBUTING.md) for branch, commit, and review conventions.

## License

MIT — see [`LICENSE.md`](./LICENSE.md).
