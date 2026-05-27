# @symbiot/viewer

Consolidated fullstack app for the symbiot plan-review loop: a Bun HTTP server
under `src/server/` and a React + Vite client under `src/client/` ship as a
single binary built by `bun run build`.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  React 19 + Vite client                                      │
│    @symbiot/editor (PlateJS)  ·  @symbiot/ui (shadcn)        │
│    @symbiot/annotations (walker + serializer)                │
└──────────────────┬───────────────────────────────────────────┘
                   │ HTTP /api/*  (single binary serves both)
┌──────────────────▼───────────────────────────────────────────┐
│  Bun server                                                  │
│    src/server/routes.ts   ← dispatch keyed on apiRoutes.ts   │
│    src/server/storage.ts  ← ~/.symbiot/history/.../00N.md    │
│    src/server/uploadSecurity.ts                              │
└──────────────────────────────────────────────────────────────┘
```

The registry of every `/api/*` route lives in
[`src/shared/apiRoutes.ts`](./src/shared/apiRoutes.ts). The Bun dispatch
table and the client `apiClient` import the same source, so paths and
methods never drift. The full route table and the request/response shapes
are in [`docs/server-contract.md`](../../docs/server-contract.md).

## Installation

Workspace dependency — no standalone install. The viewer ships as part of
the `@symbiot/hook` plugin binary; in development it's executed straight
from source via `bun src/bin.ts`.

## Usage

```sh
bun src/bin.ts --plan path/to/document.md
```

The bin accepts markdown on `--plan <path>` or stdin, writes it under
`~/.symbiot/history/<project>/<slug>/00N.md`, starts the HTTP server on a
free port, and opens the browser. The user reviews and annotates; the
server resolves the agent's wait with either an approval or the
serialized feedback markdown.

## Local development

```sh
bun run dev
```

Runs the Vite dev server (client) with a `/api/*` proxy to the Bun server
on `http://127.0.0.1:5174`. Run the server separately with:

```sh
bun src/bin.ts --plan ../../fixtures/markdown/elements.md
```

### Scripts

- `bun run dev` — Vite dev server with `/api/*` proxy.
- `bun run build` — `vite build` → `dist/client/`; then `bun build src/bin.ts` → `dist/bin.js`.
- `bun run start` — run the built binary.
- `bun run smoke` — boot against `../../fixtures/markdown/elements.md`.
- `bun run typecheck` / `bun run lint` / `bun run test`.
- `bun run bundle-analyze` — Vite build with the rollup visualizer enabled.

### Storage

Filesystem-only state under `~/.symbiot/` — no database. Plan revisions are
written atomically as `00N.md` under
`~/.symbiot/history/<project-slug>/<plan-slug>/`; drafts, annotations, and
image uploads live in sibling directories. Layout details in
[`docs/version-history.md`](../../docs/version-history.md#on-disk-layout).

### Debugging

Every viewer screen pins a small `<DebugBar>` to the bottom-right that reads
`v<version> · <short-sha>`. Hover (or keyboard-focus) surfaces a tooltip with
the full SHA, the ISO 8601 build timestamp, and the active viewer mode;
clicking the badge copies the full SHA to the clipboard.

When triaging a bug report, the fastest path is to ask the reporter for the
debug-bar SHA — that pinpoints the exact commit the binary was built from,
regardless of which install method they used (cached plugin binary,
`bun run dev`, or `hook:install`). The bar is intentionally always-on across
builds; debuggability wins over pixel real estate for v0.1.x.

Implementation lives in
[`src/client/components/DebugBar.tsx`](./src/client/components/DebugBar.tsx);
the build-time constants are resolved in [`buildInfo.ts`](./buildInfo.ts) and
injected via Vite's `define` (see [`vite.config.ts`](./vite.config.ts)). The
SHA falls back to `dev` when built outside a git checkout.

## Documentation

- [`docs/server-contract.md`](../../docs/server-contract.md) — full HTTP surface.
- [`docs/architecture.md`](../../docs/architecture.md) — viewer's place in the monorepo.
- [`docs/version-history.md`](../../docs/version-history.md) — version layout, diff overlays, drift detection.
- [`docs/perf.md`](../../docs/perf.md) — bundle and Lighthouse budgets.

## License

MIT — see the root [`LICENSE.md`](../../LICENSE.md).
