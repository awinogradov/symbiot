# @symbiot/hook

Claude Code plugin that intercepts plan-mode plans, forwards them to the
symbiot viewer for annotation, and returns the resolved markdown back to
Claude Code.

This directory doubles as the **plugin root** (`${CLAUDE_PLUGIN_ROOT}`):
`.claude-plugin/plugin.json` is the manifest, and `hooks/hooks.json`
auto-registers the `PreToolUse(ExitPlanMode)` and
`PermissionRequest(ExitPlanMode)` entries against the bundled
`dist/cli.js`.

## Install

```
/plugin marketplace add awinogradov/symbiot
/plugin install symbiot
```

The plugin requires `bun` on the user's PATH (the hook command is
`bun "${CLAUDE_PLUGIN_ROOT}/dist/cli.js" run-hook`).

## Local development

The hook also exposes a CLI (`symbiot`) that can be wired into
`~/.claude/settings.json` directly, bypassing the plugin mechanism. Useful
when iterating on the source tree without rebuilding `dist/`.

```sh
bun run hook:install     # registers settings.json hooks pointing at src/cli.ts
bun run hook:uninstall   # removes them
```

## Build

```sh
bun run build            # bundles src/cli.ts → dist/cli.js and copies
                         # apps/viewer/dist/client → dist/client
```

`dist/` is tracked in git so the plugin works after `/plugin install`
without a build step. Rebuild and commit before tagging a release.

## Scripts

- `bun run build` — bundle CLI + copy viewer client into `dist/`
- `bun run typecheck` — `tsc --noEmit`
- `bun run lint` — `eslint . --max-warnings=0`
- `bun run test` — `vitest run --passWithNoTests`
