# @symbiot/viewer

Consolidated fullstack app for the symbiot plan-review loop: a Bun HTTP server
under `src/server/` and a React + Vite client under `src/client/` ship as a
single binary built by `bun run build`.

Replaces the original `packages/symbiot-server` placeholder per the Phase 2
architectural decision (see `plans/02-mvp.md`).

## Scripts

- `bun run dev` — Vite dev server (client) with a `/api/*` proxy to the Bun
  server (`http://127.0.0.1:5174`). Run the server separately with
  `bun src/bin.ts --plan fixtures/plans/elements.md`.
- `bun run build` — `vite build` → `dist/client/`; then `bun build src/bin.ts`
  → `dist/bin.js`.
- `bun run start` — run the built binary; reads markdown from `--plan <file>`
  or stdin and opens the browser.
- `bun run typecheck` / `bun run lint` / `bun run test`.

## Phase status

Phase 2 (MVP plan-review loop) — see `plans/02-mvp.md`.
