# Phase 3.1 — Wire format + markdown completeness

> Second sub-phase of Phase 3. Lands the full plannotator-compatible codec (C/G/D tuples + dual-anchor), block-level source-line metadata, the carry-over markdown surface from Phase 2 (typography, tables, lists, syntax highlighting), and wires `CommentComposer` into the editor in place of `window.prompt`. Depends on **Phase 3.0** (Playwright-BDD harness).

## Goal

Make the wire format and markdown surface complete *before* the second annotation type is added in 3.2. After 3.1, the symbiot ↔ plannotator round-trip is provably correct for every tuple type the codec supports; the editor renders every FR-1.2 markdown element correctly; and the Comment composer popover replaces `window.prompt`. The Deletion / Global Comment authoring UIs are deliberately deferred to 3.2 — but their encoders, decoders, and golden fixtures all land here so 3.2 only has to add the UI wiring.

## Exit criteria

- [ ] `packages/symbiot-annotations` exports encoders + decoders for `['C', …]`, `['G', …]`, `['D', …]` tuples and a unified `serializeFeedback` that emits `(lines N–M)` headings when block metadata is present.
- [ ] Dual-anchor resolves: `pathAnchor` first, `originalText` text-quote fallback. Drift tests pass.
- [ ] Block-level source-line metadata is stamped on every block-level Plate node during deserialize and surfaced via `editor.api.getBlockLines(path)`.
- [ ] `CommentComposer` from `@symbiot/ui` replaces the `window.prompt` call in `ReviewEditor.tsx`.
- [ ] `@tailwindcss/typography` plugin enabled; the `prose` class on the editor container styles headings, lists, blockquote, and inline code with the symbiot tokens.
- [ ] Tables (`@platejs/table`), bullet lists, and task lists (`@platejs/list`) render correctly from the FR-1.2 fixture.
- [ ] Fenced code blocks render with Shiki syntax highlighting. `bash` / `ts` / `tsx` / `md` grammars pre-loaded synchronously; other languages lazy-load on demand.
- [ ] New golden fixtures: `fixtures/plannotator-reference/global-comment.md`, `deletion.md`, `mixed.md`. Vitest diffs `serializeFeedback()` output byte-for-byte for each.
- [ ] New Playwright-BDD specs green: `features/plan-review/comment.feature` (composer flow), `features/markdown/elements.feature` (one scenario per FR-1.2 element).

## Scope

### `packages/symbiot-annotations`

- Extend `types.ts` with `GlobalCommentTuple = ['G', text, author?, images?]` and `DeletionTuple = ['D', originalText, author?, images?]`. Union all three as `AnnotationTuple`.
- Add `encode.ts`: takes a `SymbiotDocument` (Plate value + `globalComments[]` + per-anchor comments + deletions) and emits `AnnotationTuple[]`. Single serializer owns both per-anchor annotations and `globalComments[]` per R-4.
- Add `decode.ts`: takes `AnnotationTuple[]` plus the current Plate value and rebuilds `{ comments, globalComments, deletions }`.
- Add `dualAnchor.ts`: `{ pathAnchor: number[]; originalText: string }`. `resolveAnchor(value, anchor)` tries `pathAnchor` first, falls back to a text-quote scan of `originalText` against the document's leaves if the path is invalid (different node type, out of range, or text mismatch).
- Extend `serializeFeedback.ts` to emit `## N. (lines A–B) Feedback on: "…"` when the entry carries block-line metadata; preserve the Phase-2 emission shape as the fallback when metadata is absent (back-compat with the existing `comment.md` golden).
- Replace `walkComments.ts` with `walkAnnotations.ts` (or extend in place) that returns all three annotation kinds in document order, tagged with their tuple type. Co-located with `walkAnnotations.test.ts`.

### `packages/symbiot-editor`

- Add `sourceLines.ts`: a Plate plugin (or `MarkdownPlugin` override) that stamps `{ startLine: number, endLine: number }` on every block-level node during markdown deserialize. The line numbers are 1-based against the source markdown.
- Add an editor API surface: `editor.api.getBlockLines(path)` returns the stamped range for any path (block or descendant of one).
- `ReviewEditor.tsx`: replace `promptForBody` + `window.prompt` (lines 35–64) with a `CommentComposer` instance. The composer's `anchor` prop receives a `ref`-driven invisible div positioned at the DOM selection rect (the same rect `SelectionToolbar` already computes — reuse the helper, do not re-derive).
- `kit.ts`: append `TablePlugin` from `@platejs/table` and `ListPlugin` from `@platejs/list` (covers bullet + task lists). For any new void element type, wrap in a React-19-safe component (mirror `HrElement`).
- `shiki.ts`: a lightweight wrapper around Shiki's `getHighlighter` that pre-loads `bash` / `ts` / `tsx` / `md` synchronously and lazy-loads others on first encounter. Dual-theme map (`github-light` / `github-dark`) wired to CSS variables so Phase 7 can flip themes without re-tokenizing. Plug into `CodeBlockPlugin`'s render path.

### `packages/symbiot-ui`

- `CommentComposer.tsx`: no behavior changes for 3.1. (Image-attach affordance lands in 3.3.) Add `data-testid="composer-textarea"`, `composer-save`, `composer-cancel` on the existing interactive elements.

### `apps/viewer/src/client/styles.css`

- Add `@plugin "@tailwindcss/typography";` and tune `prose` to the symbiot tokens (heading sizes, link color, blockquote border).
- Confirm `@source` directives still cover `packages/symbiot-{ui,editor}/src`. No new packages emit Tailwind classes in 3.1, so no new `@source` is required.

### `features/`

- `features/plan-review/comment.feature` — one scenario: open viewer → select text in the editor → click the Comment toolbar button → composer popover appears → type body → press Enter → composer closes → Deny → assert the decision-marker file's feedback markdown contains the body.
- `features/markdown/elements.feature` — one scenario per FR-1.2 element: confirms rendered tables, task list checkboxes, and a Shiki-highlighted code block.
- New step files: `features/steps/selection.steps.ts`, `composer.steps.ts`, `feedback.steps.ts`, `markdown.steps.ts`. All step helpers pure (no class state).
- Add `data-testid` on every new interactive element: `toolbar-comment`, `composer-textarea`, `composer-save`, `composer-cancel`.

## Out of scope (deferred)

- Deletion authoring UI → 3.2 (codec lands here; UI lands there).
- Global Comment composer UI → 3.2.
- Redline mode and mode toggle → 3.2.
- Sidebar → 3.2.
- Image attachments → 3.3.
- Drafts → 3.3.

## Tasks

1. Extend `symbiot-annotations` tuple types and add `encode.ts` / `decode.ts` with full C/G/D round-trip + tests.
2. Implement `dualAnchor.ts` with path-first / originalText-fallback resolution + drift tests.
3. Capture the three new golden fixtures from a plannotator session running against the same fixture plan; commit under `fixtures/plannotator-reference/`. Update `fixtures/plannotator-reference/README.md`.
4. Extend `serializeFeedback.ts` to emit `(lines N–M)` headings when block metadata is present; preserve Phase-2 shape otherwise.
5. Implement `sourceLines.ts` plugin in `symbiot-editor`; expose `editor.api.getBlockLines(path)`.
6. Wire `CommentComposer` into `ReviewEditor.tsx`; delete `promptForBody`.
7. Add `@platejs/table` and `@platejs/list` to `SymbiotEditorKit`. Add React-19-safe wrappers for any new void element types.
8. Add `shiki.ts` and integrate with `CodeBlockPlugin`. Pre-load `bash`/`ts`/`tsx`/`md`; lazy-load others.
9. Add `@tailwindcss/typography` to `apps/viewer/src/client/styles.css` and tune `prose`.
10. Add the two new `.feature` files + four new step files. Add `data-testid` attributes.
11. Run `bun run typecheck && lint && test && build && test:e2e` until green.

## Files to create / touch

| Package / dir | Files |
|---|---|
| `packages/symbiot-annotations` | **`src/encode.ts`**, **`src/encode.test.ts`**, **`src/decode.ts`**, **`src/decode.test.ts`**, **`src/dualAnchor.ts`**, **`src/dualAnchor.test.ts`**, **`src/walkAnnotations.ts`** (or extend `walkComments.ts` in place), `src/types.ts`, `src/serializeFeedback.ts`, `src/serializeFeedback.test.ts`, `src/index.ts` |
| `packages/symbiot-editor` | **`src/sourceLines.ts`**, **`src/shiki.ts`**, `src/kit.ts`, `src/ReviewEditor.tsx`, `src/SelectionToolbar.tsx` |
| `packages/symbiot-ui` | `src/CommentComposer.tsx` (testids only) |
| `apps/viewer` | `src/client/styles.css` |
| `fixtures/plannotator-reference/` | **`global-comment.md`**, **`deletion.md`**, **`mixed.md`**, `README.md` |
| `features/` | **`plan-review/comment.feature`**, **`markdown/elements.feature`**, **`steps/selection.steps.ts`**, **`steps/composer.steps.ts`**, **`steps/feedback.steps.ts`**, **`steps/markdown.steps.ts`** |

Bold = new file.

## Dependencies (pinned)

- `@platejs/table@53.x`
- `@platejs/list@53.x`
- `shiki@^1`
- `@tailwindcss/typography@0.5.x`

## Risks / open questions

- **R-3 (markdown round-trip lossiness).** Tables + task lists + code blocks must round-trip cleanly through markdown → Plate → markdown. Round-trip tests per element. Unknown blocks pass through verbatim — verify in this phase's tests.
- **R-4 (`globalComments` split-brain).** Single serializer in `encode.ts` owns per-anchor annotations and `globalComments[]`. Never store G-tuples as Plate marks.
- **Block-line metadata across edits.** Stamped at deserialize time; correct for read-only Phase 3.1. After Deletions (3.2) the lines become stale; document on the encoder that lines are "best-effort original."
- **Shiki bundle size.** Pre-loaded grammars (`bash`/`ts`/`tsx`/`md`) account for the sync surface. Phase 8 measures and tightens. 3.1 keeps the sync set small.
- **Plate void elements in `@platejs/table`.** Tables don't introduce voids, but `@platejs/list` task list items have checkbox state — verify React 19 strictness doesn't reject them; wrap if needed.

## Verification

```sh
bun run typecheck
bun run lint
bun run test          # codec round-trip per type; dual-anchor cases; golden fixtures byte-match
bun run build
bun run test:e2e      # 3.0 smoke + new comment.feature + elements.feature
bun run format:check
```

Manual smoke:

```sh
bun run viewer:smoke
# select text → click Comment → composer opens (NOT window.prompt)
# type body → Enter → composer closes
# scroll to a table / task list / fenced code block in the fixture plan
#   → table renders with borders
#   → task list shows checkboxes
#   → code block is syntax-highlighted via Shiki
```
