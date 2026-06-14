# Symbiot

Review and annotate the plans your AI coding agents produce, then send structured feedback back. Symbiot intercepts a plan at the moment the agent presents it, opens a browser editor where you can comment, delete, insert, and replace passages with full markdown fidelity — and edit those annotations in place afterward — then returns the resolved feedback as markdown the agent can act on.

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│       Claude Code · Codex · Gemini · OpenCode · Copilot CLI        │
└────────────────────────────────┬───────────────────────────────────┘
                                 │ PreToolUse(ExitPlanMode)
                                 ▼
┌────────────────────────────────────────────────────────────────────┐
│ apps/claude-code                                                   │
│   intercepts plan → persists to ~/.symbiot/agents/<agent-id>/…     │
│   spawns apps/viewer on a free port, opens the browser             │
└────────────────────────────────┬───────────────────────────────────┘
                                 │ HTTP /api/plan, /api/feedback, …
                                 ▼
┌────────────────────────────────────────────────────────────────────┐
│ apps/viewer                                                        │
│   Bun server  ──  React 19 + Vite client                           │
│                                                                    │
│   packages/symbiot-editor       ← PlateJS, markdown round-trip     │
│   packages/symbiot-ui           ← shadcn/ui shell + ThemeProvider  │
│   packages/symbiot-annotations  ← walk · serialize · codec         │
│   packages/tailwind-config      ← design tokens                    │
└────────────────────────────────────────────────────────────────────┘
```

`apps/portal` is the planned static share-viewer: it will consume the same `symbiot-editor` + `symbiot-ui` packages but read serialized state from a URL fragment instead of the local server. It is not yet released — the package currently exports nothing (see [`apps/portal/README.md`](./apps/portal/README.md)).

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

## Install

### Claude Code (plugin)

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
**Windows x64**. See [`docs/09-release.md`](docs/09-release.md) for the
release flow and the offline-install path.

### Codex / Copilot / Gemini (binary)

No clone or Bun required — download the verified binary and wire the host hook:

```sh
curl -fsSL https://raw.githubusercontent.com/awinogradov/symbiot/main/scripts/install.sh | bash -s -- --agent codex
# --agent copilot | gemini
# Windows (PowerShell):
# & ([scriptblock]::Create((irm https://raw.githubusercontent.com/awinogradov/symbiot/main/scripts/install.ps1))) -Agent codex
```

### OpenCode (npm)

Add the package to your OpenCode config's `plugin` list — OpenCode installs and loads it:

```jsonc
// opencode.json
{ "plugin": ["@symbiot/opencode-plugin"] }
```

See [`docs/09-release.md` § Distribution channels](docs/09-release.md#distribution-channels) for the full per-host matrix.

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

The default run is headless Chromium. To also run the Firefox/WebKit `@smoke`
matrix locally — verifying NFR-6 cross-engine support, which CI runs automatically
— install those engines and opt in with `CROSS_BROWSER=1`:

```sh
bunx playwright install firefox webkit
CROSS_BROWSER=1 bun run test:e2e
```

See [`docs/08-testing.md`](./docs/08-testing.md) for the cross-browser matrix.

Conventions and selector rules for scenarios live in [`features`](./features/README.md).

## Project structure

```
.
├── apps/
│   ├── viewer/                 Bun HTTP server + React/Vite client; single-binary build
│   ├── claude-code/            Claude Code hook (PreToolUse/PermissionRequest)
│   ├── codex/                  Codex CLI hook (Stop)
│   ├── gemini/                 Gemini CLI hook (AfterAgent)
│   ├── copilot/                Copilot CLI hook (agentStop)
│   ├── opencode-plugin/        OpenCode in-process plugin (session.idle)
│   └── portal/                 Static share-viewer (planned; not yet released)
├── packages/
│   ├── symbiot-agent-runtime/  Shared spawn-and-decide loop (runPlanReview)
│   ├── symbiot-annotations/    Annotation tuple model + codec
│   ├── symbiot-editor/         PlateJS editor as a reusable React package
│   ├── symbiot-ui/             shadcn/ui components + ThemeProvider + chrome
│   ├── eslint-config/          Shared flat ESLint 10 config
│   ├── prettier-config/        Shared Prettier config
│   ├── tailwind-config/        Tailwind v4 tokens (semantic + annotation)
│   └── typescript-config/      tsconfig presets (base / react / node)
├── docs/                       Cross-cutting architecture, product, and contract docs
├── features/                   Playwright-BDD scenarios and step helpers
├── fixtures/                   Sample markdown + golden serializer fixtures
└── CLAUDE.md                   Codebase conventions for humans and AI assistants
```

## Documentation

Read this index before touching the code — it's what CLAUDE.md points contributors at. Cross-cutting design notes live in [`docs/`](./docs/README.md); per-area READMEs sit next to their sources.

| Doc                                                                      | What it covers                                                                                                                    |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| [`CLAUDE.md`](./CLAUDE.md)                                               | Core principles, naming, lint/style rules, post-task checks.                                                                      |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md)                                   | Branch, commit, and PR conventions.                                                                                               |
| [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md)                             | Community standards.                                                                                                              |
| [`LICENSES.md`](./LICENSES.md)                                           | Third-party license manifest (distinct from `LICENSE.md`).                                                                        |
| [`docs/`](./docs/README.md)                                              | Cross-cutting architecture, product, and contract docs — start here when a change spans more than one package.                    |
| [`docs/01-product.md`](./docs/01-product.md)                             | Product goals, non-goals, personas, principles, NFRs, success metrics.                                                            |
| [`docs/02-architecture.md`](./docs/02-architecture.md)                   | App composition, package layering, HTTP surface, monorepo invariants, and the architectural specials.                             |
| [`docs/03-server-contract.md`](./docs/03-server-contract.md)             | HTTP surface between the hook and the viewer.                                                                                     |
| [`docs/04-version-history.md`](./docs/04-version-history.md)             | On-disk version layout, `/api/plan/version[s]` endpoints, History tab, diff overlays.                                             |
| [`docs/05-theming.md`](./docs/05-theming.md)                             | Annotation color tokens (OKLCH values, hex equivalents, WCAG contrast methodology).                                               |
| [`docs/06-a11y.md`](./docs/06-a11y.md)                                   | WCAG AA baseline: axe-core scenarios, keyboard nav, focus-ring policy, ARIA-label inventory, screen-reader smoke, reduced motion. |
| [`docs/07-perf.md`](./docs/07-perf.md)                                   | Performance budget, bundle visualizer + Lighthouse reproduction.                                                                  |
| [`docs/08-testing.md`](./docs/08-testing.md)                             | Unit-test coverage targets and scope, the golden-fixture CI gate, and the Playwright-BDD data-testid selector rule.               |
| [`docs/09-release.md`](./docs/09-release.md)                             | Release pipeline + shim/binary contract; cut and roll back releases, plus the cross-browser smoke checklist.                      |
| [`docs/10-add-agent-integration.md`](./docs/10-add-agent-integration.md) | How to add a new agent integration: the shared `@symbiot/agent-runtime` building blocks and a step-by-step.                       |
| [`features/`](./features/README.md)                                      | Playwright-BDD layout, selector conventions, how to add a scenario.                                                               |
| [`fixtures/markdown`](./fixtures/markdown/README.md)                     | Sample markdown fixtures + the inline-diff smoke flow.                                                                            |
| [`fixtures/golden`](./fixtures/golden/README.md)                         | Byte-equality regression fixtures for the annotation serializer.                                                                  |

### Apps

| App                                                        | Entry point                             |
| ---------------------------------------------------------- | --------------------------------------- |
| [`apps/viewer`](./apps/viewer/README.md)                   | Fullstack viewer (server + client).     |
| [`apps/claude-code`](./apps/claude-code/README.md)         | Claude Code hook entry point.           |
| [`apps/codex`](./apps/codex/README.md)                     | Codex CLI hook entry point.             |
| [`apps/gemini`](./apps/gemini/README.md)                   | Gemini CLI hook entry point.            |
| [`apps/copilot`](./apps/copilot/README.md)                 | Copilot CLI hook entry point.           |
| [`apps/opencode-plugin`](./apps/opencode-plugin/README.md) | OpenCode in-process plugin entry point. |
| [`apps/portal`](./apps/portal/README.md)                   | Shared-link viewer (planned).           |

### Packages

| Package                                                                        | What it provides                                                       |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| [`packages/symbiot-agent-runtime`](./packages/symbiot-agent-runtime/README.md) | Shared spawn-and-decide loop (`runPlanReview`) for agent integrations. |
| [`packages/symbiot-annotations`](./packages/symbiot-annotations/README.md)     | Annotation tuples + codec.                                             |
| [`packages/symbiot-editor`](./packages/symbiot-editor/README.md)               | Plate editor package, kits, modes.                                     |
| [`packages/symbiot-ui`](./packages/symbiot-ui/README.md)                       | Shared UI primitives.                                                  |
| [`packages/eslint-config`](./packages/eslint-config/README.md)                 | ESLint rulesets and `configure()`.                                     |
| [`packages/prettier-config`](./packages/prettier-config/README.md)             | Prettier settings.                                                     |
| [`packages/tailwind-config`](./packages/tailwind-config/README.md)             | Design tokens and annotation hues.                                     |
| [`packages/typescript-config`](./packages/typescript-config/README.md)         | tsconfig presets.                                                      |

## Contributing

Before opening a PR, read [`CONTRIBUTING.md`](./CONTRIBUTING.md) for branch, commit, and review conventions.

## License

MIT — see [`LICENSE.md`](./LICENSE.md).
