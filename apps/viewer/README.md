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

## HTTP surface

The registry of every `/api/*` route lives in
[`src/shared/apiRoutes.ts`](./src/shared/apiRoutes.ts). Both the Bun dispatch
table and the client `apiClient` key off the same source, so paths and
methods never drift. Full table and per-route semantics are in
[`docs/architecture.md`](../../docs/architecture.md#server-contract). The
version-browsing endpoints (`GET /api/plan/versions`,
`GET /api/plan/version?n=N`) drive the History sidebar tab; full pipeline in
[`docs/version-history.md`](../../docs/version-history.md).

## Storage

Filesystem-only state under `~/.symbiot/` — no database. Plan revisions are
written atomically as `00N.md` under
`~/.symbiot/history/<project-slug>/<plan-slug>/`; drafts, annotations, and
image uploads live in sibling directories. Layout details in
[`docs/version-history.md`](../../docs/version-history.md#on-disk-layout).

Per-phase scope and status live in
[`../../plans/README.md`](../../plans/README.md).
