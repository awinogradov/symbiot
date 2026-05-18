# @symbiot/editor

The symbiot Plate editor as a reusable React package. Pattern A read-only suggestion authoring per PRD §8.4 (validated in Phase 0).

Embedded in the browser surface that `apps/hook` opens and in `apps/portal`.

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
