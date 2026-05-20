# Symbiot

Review and annotate the plans your AI coding agents produce, then send structured feedback back. Symbiot intercepts a plan at the moment the agent presents it, opens a browser editor where you can comment, delete, insert, and replace passages with full markdown fidelity, and returns the resolved feedback as markdown the agent can act on.

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

## Quick start

```sh
bun install
bun run dev      # Vite + servers across workspaces via Turbo
bun run build    # builds every workspace
```

Smoke-run the viewer against a fixture plan:

```sh
bun run viewer:smoke
# or, explicitly:
bun --filter @symbiot/viewer start --plan fixtures/plans/elements.md
```

## Known limitations

When the reviewer clicks **Approve** in the viewer, symbiot's
`PreToolUse(ExitPlanMode)` hook emits the documented `permissionDecision:
"allow"` payload, but Claude Code currently ignores that field for the
`ExitPlanMode` matcher and still surfaces its native "Accept this plan?"
prompt — so today the reviewer accepts twice (once in symbiot, once in
Claude Code).

Tracked in [symbiot#1](https://github.com/awinogradov/symbiot/issues/1);
upstream bug is
[anthropics/claude-code#50660](https://github.com/anthropics/claude-code/issues/50660).
The auto-approve payload will start working transparently as soon as the
upstream fix lands; the **Request changes** path is unaffected and
already routes feedback back without a second prompt.

## Local testing

```sh
bun run typecheck        # tsc across the workspace graph
bun run lint             # eslint
bun run lint:fix         # eslint --fix
bun run test             # Vitest
bun run format:check     # prettier
bun run build            # final gate
```

End-to-end (Playwright-BDD, headless Chromium):

```sh
bun run test:e2e         # bddgen + playwright test
bun run test:e2e:ui      # interactive debugger
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
  hook/          Claude Code hook that opens the viewer and resolves plans
  portal/        Static viewer for shared review links
  marketing/     Public marketing site
packages/
  symbiot-annotations/  Annotation tuple model + codec
  symbiot-editor/       PlateJS editor as a reusable React package
  symbiot-ui/           shadcn/ui components + ThemeProvider + chrome
  eslint-config/        Shared flat ESLint 10 config
  prettier-config/      Shared Prettier config
  tailwind-config/      Tailwind v4 tokens (semantic + annotation)
  typescript-config/    tsconfig presets (base / react / node)
features/        Playwright-BDD scenarios and step helpers
plans/           Phase-by-phase implementation plans
fixtures/        Sample plans and wire-format references
PRD.md           Product requirements
CLAUDE.md        Codebase conventions for humans and AI assistants
```

## Documentation

Read this list before touching the code — it's the documentation index CLAUDE.md points contributors at.

- [`PRD.md`](./PRD.md) — product requirements (goals, non-goals, annotation model, server contract).
- [`CLAUDE.md`](./CLAUDE.md) — core principles, naming, lint/style rules, post-task checks.
- [`plans`](./plans/README.md) — phase table, cross-phase gates, design decisions.
- [`features`](./features/README.md) — Playwright-BDD layout, selector conventions, how to add a scenario.

Apps:

- [`apps/viewer`](./apps/viewer/README.md) — fullstack viewer (server + client).
- [`apps/hook`](./apps/hook/README.md) — Claude Code hook entry point.
- [`apps/portal`](./apps/portal/README.md) — shared-link viewer.
- [`apps/marketing`](./apps/marketing/README.md) — marketing site.

Packages:

- [`packages/symbiot-annotations`](./packages/symbiot-annotations/README.md) — annotation tuples + codec.
- [`packages/symbiot-editor`](./packages/symbiot-editor/README.md) — Plate editor package, kits, modes.
- [`packages/symbiot-ui`](./packages/symbiot-ui/README.md) — shared UI primitives.
- [`packages/eslint-config`](./packages/eslint-config/README.md) — ESLint rulesets and `configure()`.
- [`packages/prettier-config`](./packages/prettier-config/README.md) — Prettier settings.
- [`packages/tailwind-config`](./packages/tailwind-config/README.md) — design tokens and annotation hues.
- [`packages/typescript-config`](./packages/typescript-config/README.md) — tsconfig presets.

## License

MIT — see [LICENSE](./LICENSE).
