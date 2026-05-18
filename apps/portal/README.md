# @symbiot/portal

Static, single-file viewer for shared review links. Loads a plan + annotations from the URL hash (compressed + base64url, optionally AES-256-GCM encrypted), then renders read-only Plate.

## Status

Placeholder — implemented in **Phase 6** (`plans/06-sharing.md`). Currently exports nothing.

## Scripts

- `bun run typecheck` — `tsc --noEmit`
- `bun run lint` — `eslint . --max-warnings=0`
- `bun run test` — `vitest run --passWithNoTests`
