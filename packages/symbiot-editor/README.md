# @symbiot/editor

The symbiot Plate editor as a reusable React package. Pattern A read-only suggestion authoring per PRD §8.4 (validated in Phase 0).

Embedded in the browser surface that `apps/hook` opens and in `apps/portal`.

## Why a separate package

Kept distinct from `@symbiot/ui` on purpose:

- **Dependency surface.** `@symbiot/ui` is design-system only (Radix + Tailwind + `cva`/`cn`). The editor pulls in Plate, slate, shiki, remark, and `@symbiot/annotations` — folding it in would force every UI consumer to carry the Plate runtime.
- **Layered direction.** `apps/viewer` → `@symbiot/editor` → `@symbiot/ui`. One-way arrow; the editor consumes ui primitives, not the other way around.
- **Change cadence.** UI evolves with design tokens; editor evolves with the review/redline domain (suggestions, comments, markdown plugins). Separation lets each move independently.
- **Reusability.** Other surfaces (settings panels, future apps) can depend on `@symbiot/ui` without inheriting the editor stack.

## Editor surfaces

Two Plate editors live here, each with its own plugin kit:

- **`ReviewEditor`** + **`SymbiotEditorKit`** — the editable, annotation-
  authoring surface for the current plan version. Markdown via
  `@platejs/markdown` + remark-gfm, suggestion / comment marks, image
  uploads, fenced code blocks with Shiki dual-themed highlighting, source
  lines via `SourceLinesPlugin`.
- **`DiffEditor`** + **`SymbiotDiffKit`** — a read-only Plate editor that
  renders the inline diff between two markdown versions via `@platejs/diff`.
  The diff plugin is keyed `"diff"` (distinct from `"suggestion"` /
  `"comment"`) so diff nodes can never be accidentally "accepted" as
  feedback. The kit reuses the base markdown plugins but omits
  `SuggestionMarkPlugin` and `CommentPlugin` to remove any chance of
  leaf-key collision. Operations render with the same `--anno-*` token
  palette as reviewer annotations, so diff and authored marks share one
  visual language. Full pipeline in
  [`../../docs/version-history.md`](../../docs/version-history.md#diff-editor).

Architectural specials that must not be re-introduced (full list in
[`../../docs/architecture.md`](../../docs/architecture.md#react--plate)):

- `aboveNodes` render hooks return `children` for non-diff elements, not
  `undefined` — Plate drops the entire element otherwise.
- The host re-keys `DiffEditor` on `mode` change so `usePlateEditor` builds
  a fresh editor with the right initial value. Mixing `usePlateEditor`'s
  `deps` array with conditional value computation produces stale renders.

Per-phase scope and status live in
[`../../plans/README.md`](../../plans/README.md).

## Scripts

- `bun run typecheck`
- `bun run lint`
- `bun run test`
