# Phase 6 — Sharing: codec, paste service, portal, import

## Goal

Implement an offline-friendly, zero-knowledge sharing model (the model is wire-compatible with plannotator's so share URLs interoperate across both tools where annotation types overlap):

- **Small plans** share entirely via URL hash (no server round trip).
- **Large plans** use the encrypted paste service (browser-side AES-256-GCM; key stays in the URL fragment).
- **Asynchronous collaboration** via Import Review.
- **Static portal** for opening shared plans without running the local server.

## Exit criteria

- [ ] **Share codec:** `{ markdown, annotations, globalComments, meta }` → JSON → `deflate-raw` → base64url → URL fragment (PRD §6.13).
- [ ] Round-trip is **byte-lossless** across the test corpus (M4, NFR-4).
- [ ] **Encrypted paste:** AES-256-GCM browser-side encrypt → upload ciphertext to `apps/paste-service` → key stays in URL fragment. The paste service never sees plaintext or the key (zero-knowledge).
- [ ] **Import Review:** decode a teammate's share URL and merge their annotations into the local session (FR-13.4).
- [ ] `SYMBIOT_SHARE=disabled` env var hides all share/import UI (FR-13.5).
- [ ] `apps/portal`: static share viewer, fully offline, **no network calls** when rendering a hash URL (NFR-2). No analytics, no cookies beyond theme preference (NFR-3).
- [ ] Portal reuses `symbiot-editor` in read-only no-toolbar mode and `symbiot-ui` `ThemeProvider`.
- [ ] All **5 annotation tuples** round-trip (depends on Phase 5 being complete).

## Scope

### `packages/symbiot-annotations`

Share codec module:

- `serialize(doc): string` — JSON → `deflate-raw` → base64url.
- `deserialize(hash): SymbiotDocument` — reverse.
- `encrypt(doc, key): EncryptedPaste` — AES-256-GCM with random IV; key derived in-browser, never leaves the URL fragment.
- `decrypt(ciphertext, key, iv): SymbiotDocument`.

The binary format matches plannotator's so share URLs interoperate: symbiot opens plannotator shares cleanly; plannotator opens symbiot shares that use only the 3 plannotator-compatible annotation types (it skips/errors on `['I',…]` / `['R',…]`).

Fuzz tests (1000+ documents): generate random `SymbiotDocument`s, round-trip, assert deep-equal.

### `apps/paste-service`

A minimal zero-knowledge ciphertext store: PUT ciphertext + IV, return a handle; GET handle returns ciphertext. The service never sees plaintext or the key. Endpoint shape stays plannotator-compatible.

### `apps/portal`

New static Vite app:

- `vite-plugin-singlefile` for single-file HTML output (preserves NFR-2 for the portal).
- Reads URL fragment on load.
- If fragment is small → decode in-browser and render.
- If fragment is a paste-service handle → fetch ciphertext, decrypt with the in-fragment key, render.
- Inline pre-paint script that reads stored/system theme preference and sets `.dark` class before first render (full theme polish lands in Phase 7; the FOUC mitigation script lives here because the portal exists here).
- No analytics, no cookies, no network calls beyond the optional paste fetch.

### `packages/symbiot-ui`

- **Share** dialog (shadcn `Dialog`) with: copy-URL action, "Encrypt + paste" toggle for large plans, expiry note.
- **Import Review** dialog: paste a share URL, decode, merge annotations into the current session.
- Top-bar Export `DropdownMenu` gets Share + Import items enabled (Share was disabled in Phase 3 placeholder).

## Out of scope

- **Theming polish & WCAG contrast verification** → Phase 7.
- **Bundle-size targets, single-file HTML for the in-app viewer (not just the portal)** → Phase 8.
- **Multi-version share** (sharing version history) — backlog; out of this phase.

## Tasks

1. Implement `packages/symbiot-annotations/src/share.ts` with the share codec. Match plannotator's binary layout (`deflate-raw` + base64url; AES-256-GCM frame for encrypted variant) so share URLs interoperate. Type everything against `SymbiotDocument`.
2. Build `apps/paste-service`: a small Bun HTTP server that stores ciphertext by handle. Keep request/response shape plannotator-compatible.
3. Scaffold `apps/portal` as a Vite + React app; configure `vite-plugin-singlefile`.
4. Implement portal load flow (hash decode → render OR paste fetch → decrypt → render).
5. Add the inline pre-paint script to `apps/portal/index.html`.
6. Build the Share dialog and Import Review dialog in `symbiot-ui`.
7. Wire `SYMBIOT_SHARE=disabled` env var to hide all share/import UI.
8. Fuzz test the share codec (1000+ random docs, deep-equal round-trip).
9. Verify CompressionStream support and gracefully gate the share UI on `typeof CompressionStream === 'function'` (NFR-6).

## Dependencies

- `vite-plugin-singlefile`
- shadcn primitive: `Dialog`

## Risks / OQs

- **R-6 (portal FOUC).** Partial mitigation here (inline pre-paint script in `index.html`); full polish in Phase 7.
- **NFR-6 (CompressionStream).** Required for sharing; check via feature detection and provide a graceful disabled state on Safari versions that lack it.

## Verification

- **Unit (Vitest):** 1000-document fuzz of share round-trip with deep-equal assertions (M4 gate).
- **Manual:** encrypt + paste flow: write a long plan → Share → paste → URL is short → open URL in private window → identical state. Decrypt happens client-side (verify with DevTools Network panel: only the ciphertext fetch hits the paste service).
- **Manual:** set `SYMBIOT_SHARE=disabled` → confirm all share/import UI is gone.
- **Manual:** portal opens a share URL with **no network calls** in DevTools (small-plan case).
- **Cross-phase gate (after this phase):** UC4 works (developer → share → teammate → annotate → share back → import). M4 holds.
