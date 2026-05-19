# Phase 3.3 — Images + Drafts + Annotate mode

> **Status:** 🟡 Annotate mode landed (2026-05-19). `symbiot annotate <file.md>` reads a markdown file, spawns the viewer in annotate mode, blocks on `POST /api/feedback`, and prints the feedback markdown to stdout. `GET /api/plan` carries the mode flag; the top bar swaps Approve/Request-changes for Submit-feedback. Server persists annotations to `~/.symbiot/annotations/{project}/{slug}/00N.md` with atomic-write semantics. **Remaining for full 3.3:** (a) `/api/draft` round-trip + `useDraft` hook for client auto-save/restore, (b) `/api/upload` + `/api/image` with the upload-security model, (c) image-attach affordance on both composers, (d) `MediaImageKit` integration in the editor. See [Follow-ups](#follow-ups-for-the-rest-of-3-3) at the bottom of this file.

> Fourth and final sub-phase of Phase 3. Lands the remaining endpoint set with its security model (`/api/upload`, `/api/image`, `/api/draft`, `/api/feedback`), the image-attach UI on all three annotation composers, draft auto-save + restore across reloads, and the `symbiot annotate <file.md>` CLI for arbitrary markdown files. Depends on **Phase 3.2**.

## Goal

Close out Phase 3 by adding the three remaining server endpoints (each with a real security surface), the image-attach affordance on every annotation composer, drafts that survive page reloads, and the annotate-mode hook flow that lets `symbiot` annotate arbitrary markdown files outside the plan-review trigger. After 3.3, every Phase 3 exit criterion in `plans/03-critical-features.md` holds and the M2 wire-format gate (verified at end of 3.2) is carried forward through the new endpoints.

## Exit criteria

- [ ] `POST /api/upload` accepts multipart uploads of images with extensions in `[.png .jpg .jpeg .gif .webp]`. Rejects all others with HTTP 400. Generates UUID-v4 temp names. Writes to `~/.symbiot/uploads/{project}/{slug}/{uuid}.{ext}` via atomic write. Rejects path-traversal payloads (`../`, absolute paths, null bytes).
- [ ] `GET /api/image?id={uuid}` streams the bytes; 404 if missing. No directory listing.
- [ ] `GET/POST/DELETE /api/draft` round-trips a per-`{project}/{slug}` JSON blob containing the Plate value, comment bodies, global-comment bodies, and deletions. Atomic writes.
- [ ] `POST /api/feedback` accepts annotate-mode feedback markdown and writes it to `~/.symbiot/annotations/{project}/{slug}/NNN.md`. 204 on success.
- [ ] `GET /api/plan` returns a `mode: 'plan' | 'annotate'` flag.
- [ ] Image attach in `CommentComposer` and `GlobalCommentComposer`: file picker → POST `/api/upload` → returned UUID appended to the annotation's `images[]`. Preview row in the popover and in the sidebar entry. Deletion entries skip the image affordance (per the D-tuple shape, deletions support images but no body — keep the affordance accessible from the sidebar entry's edit handle).
- [ ] `useDraft.ts` hook: debounced (1 s) auto-save POST `/api/draft`. On mount, GET `/api/draft` and seed the editor; the saved state overrides markdown deserialize when present.
- [ ] In annotate mode, the top-bar dropdown replaces Approve/Request-changes with **Submit feedback** wired to `/api/feedback`.
- [ ] `apps/hook` exposes `symbiot annotate <file.md>`: reads the file → spawns viewer in annotate mode → blocks on `/api/feedback` → prints the resulting feedback markdown to stdout. Exit 0 on submit, 1 on cancel.
- [ ] New Playwright-BDD specs green: `features/plan-review/image-attach.feature`, `draft.feature`, `features/annotate/round-trip.feature`, `features/server/upload-security.feature`.

## Scope

### `apps/viewer/src/server/`

- `uploadRoute.ts`: handler for `POST /api/upload`. Parses multipart via `request.formData()`. Validates against an extension whitelist (canonical list, lowercased). Generates `crypto.randomUUID()` filenames. Resolves the target path via `path.join(uploadsRoot, project, slug, `${uuid}.${ext}`)` and asserts the resolved `path.resolve(target).startsWith(uploadsRoot)` to reject traversal. Writes via the `storage.ts` atomic-write helper.
- `imageRoute.ts`: handler for `GET /api/image?id={uuid}`. Validates `id` is a canonical UUID v4 (regex). Reads from the uploads root scoped to the current `{project}/{slug}`. No directory listing; no path joins from user input beyond the validated UUID.
- `draftRoute.ts`: GET/POST/DELETE `/api/draft`. JSON shape: `{ value: PlateValue, commentBodies: Record<string, string>, globalComments: GlobalCommentEntry[], deletions: DeletionEntry[], updatedAt: number }`. Atomic writes to `~/.symbiot/drafts/{project}/{slug}/draft.json`.
- `feedbackRoute.ts`: POST `/api/feedback`. Receives feedback markdown body, writes to `~/.symbiot/annotations/{project}/{slug}/NNN.md` using the existing `storage.ts` versioned-write pattern. 204 on success.
- `uploadSecurity.ts` + `uploadSecurity.test.ts`: pure helpers — `assertWhitelistedExtension`, `assertNoTraversal`, `mintUuidFilename`. Tested in isolation.
- `routes.ts`: register the four new routes in the dispatcher.
- `startServer.ts`: surface the `mode: 'plan' | 'annotate'` flag (from CLI / env) to the `/api/plan` response. Surface `dataDir` so the upload root resolves consistently.
- `cors.ts`: confirm the existing localhost-only origin allowlist covers the new routes (no parallel impl).

### `packages/symbiot-editor`

- Add `@platejs/media` (image plugin only — not video/audio/file) to `SymbiotEditorKit`.
- `voidImage.tsx`: React-19-safe image element wrapper (mirror `HrElement`). Reads the image src from the node and renders `<img src={…} alt={…}/>` next to a hidden `<span>{children}</span>`.

### `packages/symbiot-ui`

- Extend `CommentComposer.tsx` and `GlobalCommentComposer.tsx`:
  - Add an "Attach image" button (`ImageAttachButton.tsx`) below the textarea.
  - On file pick → POST `/api/upload` → on success, push UUID into a local `images[]` state; on save, surface the array via `onSave({ body, images })`.
  - Render `ImagePreviewList.tsx` (small thumbnail row) inside the popover and the sidebar entry.
- Update `AnnotationSidebar.tsx` to render `ImagePreviewList` per entry.

### `apps/viewer/src/client/`

- `useDraft.ts`: debounced 1-second POST `/api/draft` on any state change (comments, globalComments, deletions, Plate value). On mount, GET `/api/draft`; if present, seed the editor's initial value with the saved Plate value instead of the markdown deserialize.
- `App.tsx`:
  - Branch on `mode === 'annotate'`: replace dropdown items with **Submit feedback**.
  - Hook `useDraft` into the top-level annotation state.
  - DELETE `/api/draft` when the user clicks Clear all.

### `apps/hook/src/`

- `runAnnotate.ts`: new entry point. Reads `<file.md>` from CLI args → spawns viewer with `--mode annotate --plan <file.md> --keep-alive --no-open`-equivalent → opens the browser → blocks on `/api/feedback` resolve → prints feedback markdown to stdout → exits 0. On cancel (browser closed without submit), exit 1.
- `cli.ts`: add the `annotate <file.md>` subcommand.

### `features/`

- `features/plan-review/image-attach.feature`: drop a Comment → click Attach → select `fixtures/images/sample.png` → save → see preview in sidebar; Deny → decision-marker feedback references the image UUID.
- `features/plan-review/draft.feature`: drop two annotations → reload the page → both annotations restored. Click Clear all → reload → none restored.
- `features/annotate/round-trip.feature`: invoke `bun apps/hook/src/cli.ts annotate fixtures/plans/elements.md --no-open` against the running viewer → drop one of each annotation type → Submit → stdout matches `fixtures/plannotator-reference/mixed.md` byte-for-byte.
- `features/server/upload-security.feature`: pure-API scenario — POST with `..%2F` in form name → 400; POST with `.exe` extension → 400; POST a valid PNG → response includes a canonical UUID v4.
- New step files: `features/steps/image.steps.ts`, `draft.steps.ts`, `annotate.steps.ts`, `api.steps.ts`.
- `fixtures/images/sample.png`: small (≤2 KB) valid PNG for upload scenarios.

## Out of scope (deferred)

- Insertion / Replacement annotation types → Phase 5.
- Plan version diff → Phase 4.
- Sharing / portal → Phase 6.
- Theme polish, AA contrast → Phase 7.
- Bundle budget / a11y audit / cross-browser → Phase 8.
- Image compression / resizing — not in scope; uploads stored as-is.

## Tasks

1. Implement `uploadSecurity.ts` (pure helpers) + test. Build `uploadRoute.ts` using them.
2. Build `imageRoute.ts` with UUID-validation.
3. Build `draftRoute.ts` (GET/POST/DELETE) on top of the existing atomic-write helper.
4. Build `feedbackRoute.ts` reusing the `storage.ts` versioned-write path.
5. Wire `/api/plan`'s response to surface `mode: 'plan' | 'annotate'`. Plumb the mode flag through `startServer.ts` from the CLI.
6. Register the four routes in `routes.ts`. Update `cors.ts` if it has a per-route allowlist.
7. Add `@platejs/media` to the editor kit; wrap with `voidImage.tsx`.
8. Build `ImageAttachButton.tsx` + `ImagePreviewList.tsx`. Extend `CommentComposer.tsx` and `GlobalCommentComposer.tsx` to use them. Update `AnnotationSidebar.tsx` to render previews.
9. Build `useDraft.ts`. Hook it into `App.tsx`.
10. In annotate mode, swap the Approve/Request-changes dropdown items for **Submit feedback** wired to `/api/feedback`.
11. Implement `runAnnotate.ts` and the `annotate` subcommand in `cli.ts`.
12. Add the four `.feature` files + four step files + `fixtures/images/sample.png`.
13. Run the verification matrix until green.

## Files to create / touch

| Package / dir | Files |
|---|---|
| `apps/viewer/src/server/` | **`uploadRoute.ts`**, **`imageRoute.ts`**, **`draftRoute.ts`**, **`feedbackRoute.ts`**, **`uploadSecurity.ts`**, **`uploadSecurity.test.ts`**, `routes.ts`, `startServer.ts`, `cors.ts`, `storage.ts` |
| `packages/symbiot-editor` | `src/kit.ts`, **`src/voidImage.tsx`** |
| `packages/symbiot-ui` | **`src/ImageAttachButton.tsx`**, **`src/ImagePreviewList.tsx`**, `src/CommentComposer.tsx`, `src/GlobalCommentComposer.tsx`, `src/AnnotationSidebar.tsx`, `src/index.ts` |
| `apps/viewer/src/client/` | **`useDraft.ts`**, `App.tsx`, `api.ts` |
| `apps/hook/src/` | `cli.ts`, `runHook.ts`, **`runAnnotate.ts`** |
| `features/` | **`plan-review/image-attach.feature`**, **`draft.feature`**, **`annotate/round-trip.feature`**, **`server/upload-security.feature`**, **`steps/image.steps.ts`**, **`steps/draft.steps.ts`**, **`steps/annotate.steps.ts`**, **`steps/api.steps.ts`** |
| `fixtures/images/` | **`sample.png`** |

Bold = new file.

## Dependencies (pinned)

- `@platejs/media@53.x`

(No new Radix or shadcn deps. Server uses only Bun built-ins + `crypto.randomUUID`.)

## Risks / open questions

- **Path-traversal regressions.** `uploadSecurity.ts` is pure-function-by-design and tested in isolation, but every new path-joining helper must go through it. Code review must reject any direct `path.join(uploadsRoot, userInput)` outside that module.
- **Draft conflicts when a new plan version arrives.** Phase 3.3 prefers the latest plan over a stale draft. Behavior: if `GET /api/plan` returns a different version than the draft was saved against, discard the draft and DELETE it. Document; revisit in Phase 4 when versioning lands.
- **CORS preflight on multipart upload.** Multipart triggers an OPTIONS preflight that the existing `cors.ts` allowlist must satisfy. Add a vitest for the preflight path if not already covered.
- **`@platejs/media` voids.** Image void elements need the React-19-safe wrapper (`voidImage.tsx`). If `@platejs/media` ships its own non-void element, prefer it — no wrapper needed.
- **Annotate-mode markdown source.** The annotate CLI reads from `<file.md>` and presents the same plan-review UI in mode `annotate`. The decision pathway is `/api/feedback`, not `/api/approve`. Make sure the existing `viewer:smoke` script still works in plan mode without being affected.

## Verification

```sh
bun run typecheck
bun run lint
bun run test          # uploadSecurity tests; draft round-trip; codec still byte-match
bun run build
bun run test:e2e      # all prior phases + four new specs
bun run format:check
```

End-to-end manual:

```sh
# Plan mode round-trip with image + draft:
bun run viewer:smoke
# Drop a Comment → Attach a PNG → save → reload → draft restores annotations with image preview.
# Approve → exit 0; check decision-marker feedback references the image UUID.

# Annotate mode:
bun apps/hook/src/cli.ts annotate fixtures/plans/elements.md
# Browser opens in annotate mode; drop one of each annotation type; Submit.
# stdout prints feedback markdown that byte-matches fixtures/plannotator-reference/mixed.md.

# Hook integration still works:
bun run hook:install
# Trigger Claude Code plan-finish → viewer opens, full Phase-3 UI available.
```

After 3.3 ships:

- `plans/03-critical-features.md`'s exit-criteria checklist is fully ticked.
- M2 gate (Phase 3.2) carries forward.
- Cross-phase gate after Phase 3 (per `plans/README.md`): feedback markdown is byte-compatible with the reference plan-review format for the three shared annotation types — verified by golden-file tests *and* end-to-end Playwright runs.

## Follow-ups (for the rest of 3.3)

The first 3.3 iteration shipped annotate mode end-to-end. Remaining scope:

- **Drafts.** `POST /api/draft` / `GET /api/draft` / `DELETE /api/draft` storing per-`{project}/{slug}` JSON of the editor's Plate value + comment bodies + globalComments + deletions; `useDraft.ts` debounced client hook with auto-save on changes and restore on mount; `ReviewEditor` accepts an optional `initialValue: PlateValue` to seed from a restored draft.
- **Image uploads.** `apps/viewer/src/server/uploadSecurity.ts` (pure helpers: extension whitelist, UUID minting, traversal guard) plus `uploadRoute.ts` / `imageRoute.ts`. The pure helpers must be tested in isolation (vitest) before they're called from the multipart route.
- **MediaImageKit + composer image-attach.** Add `@platejs/media` to `SymbiotEditorKit` (with the React-19-safe `voidImage.tsx` wrapper). Build `ImageAttachButton` + `ImagePreviewList` in `@symbiot/ui` and extend both composers (`CommentComposer`, `GlobalCommentComposer`) to call `/api/upload` and pass the resulting UUID into the annotation's `images[]`.
- **E2E.** `features/plan-review/image-attach.feature`, `features/plan-review/draft.feature`, `features/server/upload-security.feature`. The annotate-mode round-trip already exists in `features/annotate/round-trip.feature`.
