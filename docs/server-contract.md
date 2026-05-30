# Server contract

The viewer ships an HTTP surface that the agent-side hook talks to. Routes are defined in one place — [`apps/viewer/src/shared/apiRoutes.ts`](../apps/viewer/src/shared/apiRoutes.ts) — and imported by both the Bun server (`apps/viewer/src/server`) and the React client (`apps/viewer/src/client`), so paths and methods never drift.

## Data flow

```
Agent exits plan mode
  → hook intercepts the plan, saves to ~/.symbiot/agents/{agentId}/history/{project}/{slug}/00N.md
  → hook starts the viewer on a port, opens the browser
  → UI GET /api/plan        → { plan, mode, meta }
  → MarkdownKit deserializes the plan → Plate value
  → if a previous version exists → @platejs/diff computeDiff() → inline diff nodes
  → reviewer annotates (CommentKit / SuggestionKit marks added to the value)
  → reviewer hits Approve / Request changes
  → annotation walker serializes the Plate value → feedback markdown
  → POST /api/approve | /api/deny | /api/feedback → server resolves → agent receives decision
```

## Modes

The viewer runs in one of two modes, surfaced as the `mode` field on `GET /api/plan`:

- **`plan`** — agent-driven plan review. The plan content is the live agent plan; the reviewer Approves or Denies.
- **`annotate`** — arbitrary markdown annotation. The reviewer submits feedback; there is no Approve/Deny gate.

## Endpoints

### Plan

| Method | Path                    | Purpose                                                                                                                                                                |
| ------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/plan`             | Returns `{ plan, mode, meta }` for the live plan. See `PlanResponse` in `apiTypes.ts`.                                                                                 |
| GET    | `/api/plan/versions`    | Returns `{ versions: number[], current }`. Drives the History tab.                                                                                                     |
| GET    | `/api/plan/version?n=N` | Returns `{ plan, meta }` for an older revision under `~/.symbiot/agents/{agentId}/history/{project}/{slug}/`.                                                          |
| POST   | `/api/plan/vscode-diff` | Spawns `code --diff <from> <to>` so external integrations can open a native diff for two persisted versions. No in-app caller — used by VS Code / Obsidian extensions. |

`PlanMeta` carries the on-disk identity (`project`, `slug`, `version`) plus a `displayName` resolved from git (`<repo> · <branch>`) that the top bar renders. Decoupling `displayName` from `project` keeps the on-disk slug stable across worktrees.

### Approve / deny / feedback

| Method | Path            | Purpose                                                                            |
| ------ | --------------- | ---------------------------------------------------------------------------------- |
| POST   | `/api/approve`  | `plan` mode only — resolves the agent's plan-mode wait with "approved".            |
| POST   | `/api/deny`     | `plan` mode only — resolves with "denied" + the serialized feedback markdown body. |
| POST   | `/api/feedback` | `annotate` mode only — submits the serialized feedback markdown body to the agent. |

The feedback body in all three is the markdown produced by [`packages/symbiot-annotations`](../packages/symbiot-annotations/README.md). Its byte-level format is held constant by the golden fixtures under [`fixtures/golden/`](../fixtures/golden/README.md).

### Draft

| Method | Path         | Purpose                                                                                |
| ------ | ------------ | -------------------------------------------------------------------------------------- |
| GET    | `/api/draft` | Returns the persisted reviewer draft (`DraftPayload`) or `204 No Content` when absent. |
| POST   | `/api/draft` | Persists the draft. Same shape as the GET response.                                    |
| DELETE | `/api/draft` | Clears the persisted draft.                                                            |

Drafts persist the reviewer's in-progress annotations across viewer restarts. Optional fields on `DraftPayload` accommodate drafts persisted by older viewer versions — the walker tolerates missing drift signals and falls back gracefully.

### Image upload

| Method | Path          | Purpose                                                                                                                                                     |
| ------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/upload` | Uploads an image attachment. Returns the canonical path used by `/api/image`. Enforces extension whitelist, UUID temp names, and path-traversal protection. |
| GET    | `/api/image`  | Serves an uploaded image by path.                                                                                                                           |

See [`apps/viewer/src/server/uploadSecurity.ts`](../apps/viewer/src/server/uploadSecurity.ts) for the upload validation rules.

## Version history

The version subset of the contract — `/api/plan/version[s]`, the History tab, drift detection, and the diff overlay — is documented end-to-end in [`version-history.md`](./version-history.md). That doc is the source of truth for the on-disk `~/.symbiot/agents/{agentId}/history/{project}/{slug}/00N.md` layout.

## Contract stability

- Route paths and methods are declared once in `apiRoutes.ts`. Adding a route means adding an entry there and a handler in `apps/viewer/src/server/routes.ts`.
- Wire types live in [`apps/viewer/src/shared/apiTypes.ts`](../apps/viewer/src/shared/apiTypes.ts). Both client and server import from `shared/` so neither half can change a shape without the other compiling against it.
- The feedback-markdown body format (output of `packages/symbiot-annotations`) is pinned by the golden fixtures under [`fixtures/golden/`](../fixtures/golden/README.md). Any change there is a contract change and breaks the byte-equality tests on purpose.
