# @symbiot/hook

Claude Code plugin that intercepts plan-mode plans, forwards them to the
embedded symbiot viewer for annotation, and returns the resolved markdown
back to Claude Code.

This directory doubles as the **plugin root** (`${CLAUDE_PLUGIN_ROOT}`):

- `.claude-plugin/plugin.json` — plugin manifest (name, version, repo).
- `hooks/hooks.json` — registers `SessionStart`,
  `PreToolUse(ExitPlanMode)`, and `PermissionRequest(ExitPlanMode)`,
  each invoking `${CLAUDE_PLUGIN_ROOT}/bin/symbiot`.
- `bin/symbiot` — POSIX shell shim that downloads + execs the
  platform-specific binary from GitHub Releases.
- `bin/symbiot.cmd` — Windows counterpart.
- `bin/VERSION`, `bin/SHA256SUMS` — the version + hash manifest the
  shim verifies downloads against.

## Install

```
/plugin marketplace add awinogradov/symbiot
/plugin install symbiot
```

No Bun, no Node, no other runtime needed on the user side. On the first
session after install the shim downloads a ~60 MB binary for the
current platform into `${CLAUDE_PLUGIN_DATA}/bin/` and verifies its
SHA256 against `bin/SHA256SUMS`.

See [`docs/release.md`](../../docs/release.md) for the release flow and
the offline-install path.

## Local development

For contributors iterating on the source tree (no need to compile a
binary on every change), the legacy installer still works:

```sh
bun run hook:install     # registers settings.json hooks pointing at src/cli.ts
bun run hook:uninstall   # removes them
```

This path requires `bun` on your PATH and runs the TypeScript source
directly via `bun src/cli.ts run-hook`.

## Build a binary locally

```sh
bun run compile:darwin-arm64   # or :darwin-x64 / :linux-x64 / :windows-x64
bun run compile:all            # all 4 platforms (CI does this on tag push)
```

The viewer must be built first (Turborepo handles this via
`dependsOn: ["^build"]`):

```sh
bun --filter @symbiot/viewer build
```

## Scripts

- `bun run build` — non-compiled JS bundle of the CLI (dev convenience).
- `bun run compile:<triple>` — single-file binary for one platform.
- `bun run compile:all` — all 4 supported platforms.
- `bun run typecheck` — `tsc --noEmit`.
- `bun run lint` — `eslint . --max-warnings=0`.
- `bun run test` — `vitest run --passWithNoTests`.
