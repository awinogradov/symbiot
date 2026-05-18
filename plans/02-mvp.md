# Phase 2 — Claude Code hook MVP

> Smallest possible vertical slice: render + Approve/Deny + one anchored Comment.

## Goal

Prove the full plan-review loop end-to-end: Claude Code finishes a plan → hook intercepts → symbiot-server saves to `~/.symbiot/history/{project}/{slug}/00N.md` → browser opens → Plate renders the markdown read-only → reviewer can drop **one anchored Comment** → Approve or Request-changes → server resolves → agent receives the decision. Validates Pattern A (from Phase 0) in the real product context.

## Exit criteria

- [ ] `bun symbiot install-hook` installs the Claude Code hook (using Claude Code's standard `~/.claude/settings.json` hook mechanism).
- [ ] Triggering Claude Code's plan-finish event opens a browser at `http://localhost:<port>/`.
- [ ] Plan renders in Plate read-only with full markdown fidelity for the FR-1.2 element set: headings, paragraphs, ordered/unordered/nested lists, task lists, fenced code blocks with syntax highlighting, inline code, blockquotes, tables, links, images, horizontal rules, bold/italic/strikethrough.
- [ ] Selecting text shows a floating toolbar with one action: **Comment**.
- [ ] Clicking Comment opens a popover composer (`shadcn Popover` + `Textarea` + Save/Cancel). Enter saves; Escape cancels.
- [ ] Saving applies a `CommentKit` mark on the selection; comment surfaces on hover.
- [ ] **Approve** posts to `/api/approve`; Claude Code proceeds.
- [ ] **Request changes** posts to `/api/deny` with feedback markdown that includes the comment quoted under its anchor text, using the plannotator-compatible wire format for interoperability.
- [ ] Server resolves and shuts down cleanly per invocation.
- [ ] Comment markdown export is **byte-compatible** with the plannotator feedback format (golden-file test against a captured reference fixture).

## Scope

### `packages/symbiot-server` (plan mode subset)

Implement plan-mode endpoints. The route contract is plannotator-compatible so existing agent integrations can target it. Endpoints implemented:

- `GET  /api/plan` — return the current plan markdown.
- `POST /api/approve` — resolve the agent decision (approve).
- `POST /api/deny` — resolve the agent decision (request changes) with feedback markdown body.

**Skipped (later phases):**
- `/api/feedback` → Phase 3 (annotate mode).
- All `/api/plan/version*`, `/api/plan/history`, `/api/plan/vscode-diff` → Phase 4.
- `/api/upload`, `/api/image` → Phase 3.
- `/api/draft` → Phase 3.

Runtime: **Bun** (fast cold-start; CLI plugin spawns per invocation). Storage root: **`~/.symbiot/`**. Security model: localhost-only binding, CORS restricted to the local viewer origin, UUID-named temp files for uploads, extension whitelist on writes.

### `apps/hook`

Implement the Claude Code interceptor: a small CLI that registers a `Stop`/`PostToolUse` hook in `~/.claude/settings.json`, spawns the server on a free port, opens the browser, blocks on the server's resolve, and emits the agent decision back to Claude Code. All paths under `~/.symbiot/`. CLI command is `symbiot`.

### `packages/symbiot-editor`

Minimal Plate kit:

```
SymbiotEditorKit = [
  ...MarkdownKit,        // remark + GFM (FR-1.1, FR-1.3)
  ...CodeBlockKit,       // fenced + syntax highlighting (FR-1.5)
  ...BasicNodesKit,      // headings, lists, quotes, tables, links
  ...CommentKit,         // anchored comments
  ...FloatingToolbarKit, // selection toolbar
]
```

One `ReviewEditor` component. Pattern A locked in: `readOnly` default, free typing blocked at event layer (per Phase 0 findings), programmatic comment-apply unlocks-and-relocks around the transaction.

### `packages/symbiot-annotations`

Walk the Plate value, extract comment marks, emit feedback markdown using the `['C', originalText, text]` compact tuple → quoted-under-anchor markdown format (wire-compatible with plannotator). Golden-file test for the one Comment flow.

### `packages/symbiot-ui`

- `ThemeProvider` supporting `system | light | dark` (minimal; full polish is Phase 7). Ship it now so the rest of the app builds against it.
- Inline pre-paint script template for future use (not yet integrated; full FOUC mitigation is Phase 7).
- Minimal top bar with Approve / Request-changes buttons.
- Empty `Sidebar` slot (real sidebar in Phase 3).
- Vendor only the shadcn primitives needed here: `Button`, `Popover`, `Textarea`, `Tooltip`.

## Out of scope (deferred)

- Deletion, Global Comment, Redline mode → **Phase 3**.
- Insertion, Replacement → **Phase 5**.
- Image attachments, drafts → **Phase 3**.
- Version history, diff → **Phase 4**.
- Sharing, paste service, portal → **Phase 6**.
- OpenCode / Codex / Copilot CLI / Pi / Gemini → **Phase 9**.

## Tasks

1. Scaffold `packages/symbiot-server` with Bun runtime; implement the three plan-mode endpoints; verify with `curl`.
2. Build `apps/hook`: Claude Code interceptor CLI; storage under `~/.symbiot/`; CLI command `symbiot`.
3. Implement Plate kit in `packages/symbiot-editor` with the kits above.
4. Implement Pattern A: event-layer typing block + programmatic `applyComment(editor, selection, body)` helper.
5. Build the Comment popover composer in `packages/symbiot-ui` using shadcn `Popover` + `Textarea`.
6. Implement comment-only serializer in `packages/symbiot-annotations`.
7. Wire end-to-end: hook → server → browser → editor → approve/deny → server resolves.
8. Golden-file test: capture a reference plannotator feedback emission for the same fixture Comment; assert byte-equivalence.

## Dependencies

- `platejs`, `@platejs/markdown`, `@platejs/comment`, `@platejs/react`, `@platejs/code-block`, `@platejs/basic-nodes`, `@platejs/floating-toolbar`
- `bun` (server runtime; pinned via `packageManager` or a per-app `package.json`)
- `vite`, `@vitejs/plugin-react`
- shadcn vendored components: `button`, `popover`, `textarea`, `tooltip` via `bunx shadcn@latest add`
- `lucide-react` (icons)

## Risks / OQs

- **OQ-1** was resolved in Phase 0. If Phase 0 chose Pattern B (always-editable, locked UI), revise the editor wrappers here accordingly.
- **R-1 (bundle size)** is observed but not gated until Phase 8.

## Verification

1. `bun run build && bun symbiot install-hook`.
2. Start Claude Code; ask it to plan a task; exit plan mode.
3. Browser opens; verify plan renders correctly across the FR-1.2 element set (use a fixture plan with every element).
4. Drop a Comment on a selection; click Approve. Verify Claude Code proceeds.
5. Repeat; click **Request changes**. Verify agent sees feedback markdown with the comment quoted under its anchor.
6. **Golden file:** compare emitted feedback markdown byte-for-byte against the captured plannotator reference fixture for the same Comment on the same fixture plan.
7. Server cleanly shuts down between invocations (no port reuse conflicts).
