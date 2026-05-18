# @symbiot/server

HTTP server that backs `apps/hook`: receives plan markdown from the Claude Code hook, opens the browser editor, blocks until the user resolves the review, and returns the resolved markdown.

Built on Bun's native HTTP server (PRD §8.1).

## Status

Placeholder. Phased rollout:

- **Phase 2** — plan-mode only: open / approve / deny endpoints.
- **Phase 3** — annotate mode: full Comment/Global Comment/Deletion endpoints.
- **Phase 4** — versioning.

## Scripts

- `bun run typecheck`
- `bun run lint`
- `bun run test`
