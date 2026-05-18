# @symbiot/hook

Claude Code hook that intercepts plan-mode plans, forwards them to the symbiot server for annotation, and returns the resolved markdown back to Claude Code.

Runs as a single-file Bun script invoked by Claude Code's hook mechanism (PRD §8.2).

## Status

Placeholder — implemented in **Phase 2** (`plans/02-mvp.md`). Currently exports nothing.

## Scripts

- `bun run typecheck` — `tsc --noEmit`
- `bun run lint` — `eslint . --max-warnings=0`
- `bun run test` — `vitest run --passWithNoTests`
