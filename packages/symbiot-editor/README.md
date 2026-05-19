# @symbiot/editor

The symbiot Plate editor as a reusable React package. Pattern A read-only suggestion authoring per PRD §8.4 (validated in Phase 0).

Embedded in the browser surface that `apps/hook` opens and in `apps/portal`.

## Why a separate package

Kept distinct from `@symbiot/ui` on purpose:

- **Dependency surface.** `@symbiot/ui` is design-system only (Radix + Tailwind + `cva`/`cn`). The editor pulls in Plate, slate, shiki, remark, and `@symbiot/annotations` — folding it in would force every UI consumer to carry the Plate runtime.
- **Layered direction.** `apps/viewer` → `@symbiot/editor` → `@symbiot/ui`. One-way arrow; the editor consumes ui primitives, not the other way around.
- **Change cadence.** UI evolves with design tokens; editor evolves with the review/redline domain (suggestions, comments, markdown plugins). Separation lets each move independently.
- **Reusability.** Other surfaces (settings panels, future apps) can depend on `@symbiot/ui` without inheriting the editor stack.

## Status

Placeholder. Phased rollout:

- **Phase 2** — minimal Plate kit (`MarkdownKit`, `CommentKit`, `SuggestionKit`), read-only render + Approve/Deny + anchored Comment.
- **Phase 3** — full annotation set (Comment, Global Comment, Deletion), Review + Redline modes, sidebar.
- **Phase 4** — `@platejs/diff` inline diff.
- **Phase 5** — Insertion + Replacement annotations.

## Scripts

- `bun run typecheck`
- `bun run lint`
- `bun run test`
