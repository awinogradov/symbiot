# symbiot — Product Requirements Document

**Project / repo:** `symbiot`
**Status:** Draft v1.2
**Type:** Rewrite of [plannotator](https://github.com/backnotprop/plannotator) on PlateJS
**Owner:** _TBD_
**Last updated:** 2026-05-22

> **Changelog v1.1 → v1.2**
> - Insertion (§6.5) and Replacement (§6.6) authored end-to-end as net-new symbiot extensions beyond the plannotator-compatible 3-tuple set (Appendix A).
> - §8.4 OQ-1 resolved: Pattern A confirmed in Phase 0 — `editor.tf.*` transforms bypass `contenteditable=false`, no transient readOnly toggle needed.
> - Phase 5 closed (§11).

> **Changelog v1.0 → v1.1**
> - Code review mode removed entirely (out of scope).
> - UI element layer standardized on Tailwind CSS + shadcn/ui (Radix primitives).
> - Light/dark theming added, defaulting to the OS preference.
> - Monorepo tooling switched to pnpm workspaces + Turborepo.
> - Naming finalized: repo `symbiot`, editor package `symbiot-editor`, server package `symbiot-server`, CLI command `symbiot`, storage dir `~/.symbiot/`.
> - UI/UX no longer mirrors Plannotator; symbiot adopts a minimal shadcn-based design system.
> - Added §16 References.

---

## 1. Summary

`symbiot` is a ground-up rewrite of [Plannotator](https://github.com/backnotprop/plannotator)'s review-and-annotation tool on top of **PlateJS**. Plannotator lets developers visually mark up the *plans* produced by AI coding agents (Claude Code, Codex, OpenCode, Pi, Copilot CLI), then send structured feedback back to the agent with one click. Its UI today is built on a hand-rolled markdown parser, a custom block model, a custom annotation overlay, and a custom line-diff engine.

This rewrite replaces that bespoke editing core with PlateJS and its first-party plugins (`MarkdownKit`, `CommentKit`, `SuggestionKit`, `@platejs/diff`), builds all surrounding UI elements with **Tailwind CSS + shadcn/ui**, and re-organizes the codebase as a **pnpm + Turborepo** monorepo. The CLI hooks/plugins, the local server, filesystem version history, and the encrypted paste/share service are **retained in behavior** and re-integrated against the new editor.

The goal: the same core product (annotate agent plans, send feedback), with dramatically less custom code, a real document model instead of a string-offset overlay, a maintained editor foundation, and a clean minimal UI.

---

## 2. Background & Motivation

### 2.1 What Plannotator does today

When an AI coding agent finishes planning, Plannotator intercepts the plan, opens a browser UI, and lets the human:

1. **Review** the plan rendered from markdown.
2. **Annotate** it with five annotation types (deletion, insertion, replacement, comment, global comment).
3. **Approve** → the agent proceeds, or **Request changes** → annotations are serialized to markdown feedback and routed back into the agent loop.

It also supports **plan diffing** across agent revisions, **markdown file annotation**, **URL-based sharing** with end-to-end encryption, and a **code review** mode for git diffs / PRs.

### 2.2 Scope of the symbiot rewrite

symbiot reproduces the **plan review**, **plan diffing**, **markdown annotation**, and **sharing** capabilities. Plannotator's **code review** feature is **explicitly out of scope** — see §3.2. The result is a focused product: *annotate AI-agent plans and arbitrary markdown documents, then feed structured feedback back to the agent.*

### 2.3 Why rewrite the editor on PlateJS

The current editor layer carries structural debt:

| Current approach | Problem | PlateJS replacement |
|---|---|---|
| Custom `parser.ts` markdown → block model | Bespoke, partial markdown support; every new element is hand-coded | `MarkdownKit` (remark-based, round-trips markdown) |
| Annotations as string-offset overlays on rendered HTML | Offsets drift when content/versions change; overlapping ranges are fragile | Comments & suggestions as **document marks** in the editor model |
| `planDiffEngine.ts` line-level diff | Line-granular only; no inline/word diff; separate from the document model | `@platejs/diff` `computeDiff()` produces inline diffs as suggestion nodes |
| Deletion/insertion/replacement hand-built | Reimplements track-changes from scratch | `SuggestionKit` — Google-Docs-style tracked insert/delete/replace with accept/reject |
| Comment/global-comment hand-built | Reimplements threaded comments | `CommentKit` — anchored & overlapping comments, discussions, sidebar |

**Net effect:** the annotation model becomes part of a real document tree (Slate nodes), not a fragile sidecar. Markdown export, version diffing, and overlapping annotations all become first-class instead of special cases.

### 2.4 Non-motivations

This is **not** a redesign of the agent-integration mechanism, the storage format philosophy, or the sharing/privacy model. Those are preserved. The rewrite is scoped to the editor, the UI element layer, the monorepo tooling, and the data contract around them.

---

## 3. Goals & Non-Goals

### 3.1 Goals

- **G1.** Reproduce 100% of Plannotator's plan-annotation feature set (the five annotation types, both editor modes) on PlateJS.
- **G2.** Render any markdown plan/document with full fidelity and round-trip it back to markdown losslessly.
- **G3.** Make annotations live in the document model so they survive version changes and can overlap.
- **G4.** Replace the custom line-diff engine with Plate's inline diff for plan-version comparison.
- **G5.** Preserve the existing server API contract (plan + annotate modes) and CLI integration so the hooks/plugins need minimal change.
- **G6.** Preserve URL sharing, including the compact serialized format and E2E-encrypted short links.
- **G7.** Build every non-document UI element (sidebars, menus, dialogs, toolbars, tabs) with **shadcn/ui** components on **Tailwind CSS**.
- **G8.** Support light and dark themes, defaulting to the operating-system preference.
- **G9.** Ship a read-first experience: the reviewer is reading, not authoring; editing affordances are deliberate, not ambient.

### 3.2 Non-Goals

- **NG1.** No change to the CLI install flow, hook/tool interception mechanism, or agent feedback routing.
- **NG2.** **Code review mode is out of scope.** symbiot does not render git diffs or GitHub/GitLab PRs, has no diff viewer, no file tree, no line-anchored code annotations, and no "Ask AI" code panel. The product handles markdown plans and markdown documents only.
- **NG3.** No real-time multiplayer / live collaboration. Sharing stays asynchronous (export → import).
- **NG4.** No accounts, no hosted database. Storage stays filesystem + opt-in encrypted paste.
- **NG5.** No move to Tiptap Pro / Liveblocks / any paid SaaS. PlateJS plugins are MIT and vendored via the shadcn registry.
- **NG6.** symbiot does **not** replicate Plannotator's visual styling. It adopts its own minimal shadcn-based design system (§10).

---

## 4. Personas & Core Use Cases

**P1 — The agent-driving developer.** Runs Claude Code / Codex / etc. Wants to quickly approve good plans and redline bad ones without breaking flow. Primary mode: fast review + redline.

**P2 — The reviewing teammate.** Receives a shared plan URL. Adds their own annotations, sends them back. Primary mode: read + comment, then export.

**P3 — The self-hoster.** Runs the paste service and share portal on their own infra. Cares about the data contract and zero-knowledge guarantees, not the editor internals.

### Core use cases

- **UC1.** Agent emits a plan → UI opens → developer reviews, annotates, approves or requests changes.
- **UC2.** Agent revises a plan → UI shows a diff between version N-1 and N → developer reviews the delta.
- **UC3.** Developer annotates an arbitrary markdown file (`annotate` command) and routes feedback to the agent.
- **UC4.** Developer shares an annotated plan; a teammate imports it, adds annotations, shares back.

---

## 5. Product Principles

1. **Read-first, edit-on-intent.** The default surface is a clean rendered document. Annotation tools appear on selection; they never clutter the reading experience.
2. **Annotations are document data.** Every annotation is a node/mark in the Plate value, not an overlay keyed by character offset.
3. **Markdown is the boundary.** Input is markdown, export is markdown, the wire format the agent sees is markdown. The Plate value is an internal representation only.
4. **The model survives versions.** Because annotations are anchored in the document tree, a re-rendered or diffed plan keeps annotations meaningful.
5. **Minimal by construction.** All UI elements come from shadcn/ui. No custom-styled chrome where a shadcn primitive exists. Neutral palette, restrained motion, theme-token-driven color.

---

## 6. Scope — Functional Requirements

### 6.1 Document ingestion & rendering

- **FR-1.1** The editor SHALL accept a markdown string and deserialize it to a Plate value using `MarkdownKit` (remark + GFM).
- **FR-1.2** Supported elements at minimum: headings, paragraphs, ordered/unordered/nested lists, task lists, code blocks (with syntax highlighting), inline code, blockquotes, tables, links, images, horizontal rules, bold/italic/strikethrough.
- **FR-1.3** The editor SHALL serialize its current value back to markdown losslessly for unannotated content (`MarkdownKit` serialize).
- **FR-1.4** Rendering SHALL run inside `<Plate>` in `readOnly` mode by default (interactive read-only — comment popovers and selection toolbar still function; see §8.3 for the suggestion-mode caveat).
- **FR-1.5** Code blocks SHALL render with a language label and syntax highlighting; markdown fenced-language hints SHALL be preserved on round-trip.

### 6.2 Annotation type — Comment (anchored)

Maps to Plannotator `COMMENT`.

- **FR-2.1** The reviewer SHALL select any text span (word, phrase, sentence, or across paragraph) and attach a comment.
- **FR-2.2** Comments SHALL be implemented with `CommentKit` (`@platejs/comment`) as overlapping text marks.
- **FR-2.3** The anchored span SHALL be visually highlighted; hovering or clicking SHALL surface the comment thread.
- **FR-2.4** Comments SHALL support a discussion thread (multiple replies) and a resolved/unresolved state.
- **FR-2.5** Each comment SHALL record `author`, `createdAt`, and optional image attachments (§6.9).

### 6.3 Annotation type — Global comment

Maps to Plannotator `GLOBAL_COMMENT`.

- **FR-3.1** The reviewer SHALL add a document-level comment with no text anchor.
- **FR-3.2** Global comments SHALL appear in the sidebar only and SHALL NOT mark the document body.
- **FR-3.3** Stored as a separate `globalComments[]` collection on the document model (not a Plate mark).

### 6.4 Annotation type — Deletion

Maps to Plannotator `DELETION`.

- **FR-4.1** The reviewer SHALL select text and mark it for removal.
- **FR-4.2** Deletions SHALL be implemented as **delete suggestions** via `SuggestionKit` (`@platejs/suggestion`).
- **FR-4.3** Deleted text SHALL render struck-through with a removal-colored highlight; it SHALL remain visible (not actually removed) so the agent sees what was struck.
- **FR-4.4** A deletion SHALL be independently acceptable/rejectable and SHALL carry `author` + `createdAt`.

### 6.5 Annotation type — Insertion

Maps to Plannotator `INSERTION`.

- **FR-5.1** The reviewer SHALL select a short context span as an anchor and supply new text to insert after it.
- **FR-5.2** Insertions SHALL be implemented as **insert suggestions** via `SuggestionKit`.
- **FR-5.3** Inserted text SHALL render with an insertion-colored highlight, visually distinct from deletions.

### 6.6 Annotation type — Replacement

Maps to Plannotator `REPLACEMENT`.

- **FR-6.1** The reviewer SHALL select text and supply replacement text.
- **FR-6.2** Replacements SHALL be implemented as a **replace suggestion** via `SuggestionKit` (delete + insert pair, tracked as one unit).
- **FR-6.3** Original text and proposed text SHALL both be visible and visually paired.

### 6.7 Editor modes

- **FR-7.1 Review mode (default).** Document is read-only; selecting text shows a floating toolbar offering all annotation types.
- **FR-7.2 Redline mode.** Selecting text immediately creates a deletion with no type picker. A mode toggle in the header switches between Review and Redline.
- **FR-7.3** Mode state SHALL persist across sessions (local persistence).
- **FR-7.4** In both modes the document body itself is never freely editable — the only mutations are annotation creation. Free-form typing is disabled.

### 6.8 Selection toolbar

- **FR-8.1** A floating toolbar SHALL appear on non-empty text selection, positioned near the selection (Plate floating-toolbar primitive, styled with shadcn tokens).
- **FR-8.2** In Review mode it SHALL offer: Comment, Delete, Insert, Replace.
- **FR-8.3** In Redline mode it SHALL be suppressed (selection auto-creates a deletion) or reduced to a single "Undo last redline" affordance.
- **FR-8.4** Insert/Replace/Comment SHALL open a small inline composer for the required text input; Delete SHALL apply immediately.

### 6.9 Image attachments

- **FR-9.1** Any annotation type SHALL support attaching images, each with a `path` and a human-readable `name`.
- **FR-9.2** Image upload SHALL use the existing server `/api/upload` endpoint and validation rules (extension whitelist, UUID temp names, path-traversal protection). No change to server security model.
- **FR-9.3** Attached images SHALL appear in the annotation's sidebar entry and SHALL be referenced in exported feedback markdown.

### 6.10 Sidebar — annotation list

- **FR-10.1** A collapsible sidebar SHALL list every annotation in document order, grouped/filterable by type. Built with the shadcn `Sidebar` component.
- **FR-10.2** Clicking an annotation SHALL scroll to and focus its anchor in the document.
- **FR-10.3** Global comments SHALL appear in a dedicated sidebar section.
- **FR-10.4** The sidebar SHALL show an annotation count and provide a "clear all" action with a shadcn `AlertDialog` confirmation.

### 6.11 Plan version history & diff

- **FR-11.1** The server provides version history (`001.md`, `002.md`, …); the UI SHALL list versions in the sidebar (Version Browser).
- **FR-11.2** When a previous version exists, the UI SHALL render a diff between the selected version and its predecessor.
- **FR-11.3** Diffing SHALL use `@platejs/diff` `computeDiff()`, producing inline (word/character-level) additions and deletions rendered as suggestion-style marks — replacing the legacy line-only `planDiffEngine.ts`.
- **FR-11.4** The UI SHALL offer a clean diff view (changes only, inline) and a raw diff view (full markdown, unified), toggled via a shadcn `Tabs` or `ToggleGroup`.
- **FR-11.5** Annotations SHALL remain attached to their anchors when switching versions, where the anchored text still exists.

### 6.12 Export & agent feedback

- **FR-12.1** On **Approve**, the UI SHALL POST to `/api/approve`; on **Request changes**, POST to `/api/deny` (or `/api/feedback` for annotate mode), preserving the current API contract.
- **FR-12.2** Annotations SHALL be serialized to human-readable markdown feedback in the existing format, e.g. deletion as struck text, replacement as "Replace with: …", comments quoted under their anchor text, global comments in their own section.
- **FR-12.3** The serializer SHALL walk the Plate value, extract comment marks, suggestion nodes, and the `globalComments[]` collection, and emit the agreed markdown structure.
- **FR-12.4** Export SHALL be deterministic and stable so the same annotation set always yields the same feedback markdown.

### 6.13 Sharing & collaboration

- **FR-13.1** The UI SHALL serialize `{ markdown, annotations, globalComments, meta }` to the existing compact JSON shape, `deflate-raw` compress, base64url-encode, and append to the URL hash.
- **FR-13.2** Small plans SHALL share entirely in-URL with no server round-trip.
- **FR-13.3** Large plans SHALL optionally use the encrypted paste service: AES-256-GCM encrypt in-browser, upload ciphertext, key stays in the URL fragment. No change to the paste service.
- **FR-13.4** **Import Review** SHALL decode a teammate's share URL and merge their annotations into the current session.
- **FR-13.5** A `SYMBIOT_SHARE=disabled` environment variable SHALL hide all share/import affordances.
- **FR-13.6** The annotation serialization format MUST round-trip: an annotation created in symbiot, shared, and re-imported MUST be identical.

### 6.14 Theming

- **FR-14.1** The app SHALL support **light** and **dark** themes.
- **FR-14.2** The default theme SHALL follow the OS preference via `prefers-color-scheme`; a `ThemeProvider` SHALL resolve `system | light | dark`.
- **FR-14.3** A theme toggle SHALL be available in Settings; an explicit user choice SHALL persist locally and override the system default.
- **FR-14.4** All color SHALL be expressed through shadcn/Tailwind CSS variables (`--background`, `--foreground`, `--muted`, etc.) plus a small set of annotation tokens (`--anno-delete`, `--anno-insert`, `--anno-replace`, `--anno-comment`), each defined for both themes.
- **FR-14.5** Annotation highlight colors MUST meet WCAG AA contrast in both themes.
- **FR-14.6** The static share portal SHALL respect the same theming, with no flash of incorrect theme on load.

---

## 7. PlateJS Plugin Mapping

The authoritative mapping from Plannotator concepts to PlateJS. All Plate plugins and shadcn components are MIT-licensed and vendored into the repo via the shadcn registry (`pnpm dlx shadcn@latest add …`), so the team owns and can restyle the source.

| Plannotator concept | PlateJS mechanism | Kit / package |
|---|---|---|
| Markdown parse (`parser.ts`) | Markdown deserialize/serialize | `MarkdownKit` / `@platejs/markdown` |
| `COMMENT` annotation | Comment marks + discussion | `CommentKit` / `@platejs/comment` |
| `GLOBAL_COMMENT` | App-level collection (not a Plate mark) | custom (sidebar + model) |
| `DELETION` | Delete suggestion | `SuggestionKit` / `@platejs/suggestion` |
| `INSERTION` | Insert suggestion | `SuggestionKit` |
| `REPLACEMENT` | Replace suggestion (delete+insert unit) | `SuggestionKit` |
| Redline mode | `isSuggesting` option + auto-delete on select | `SuggestionKit` + custom handler |
| Selection toolbar | Floating toolbar primitive | `FloatingToolbarKit` |
| Plan version diff (`planDiffEngine.ts`) | `computeDiff()` → inline diff nodes | `@platejs/diff` |
| Read/annotate rendering | `<Plate readOnly>` (interactive read-only) | `platejs/react` |
| Code blocks + highlight | Code block plugin | `CodeBlockKit` |
| Image attachments | Media/image plugin + existing upload API | `MediaKit` (image only) |
| Markdown export to agent | `serializeMd` + custom annotation walker | `@platejs/markdown` + custom |

### 7.1 Editor configuration sketch

```
SymbiotEditorKit = [
  ...MarkdownKit,        // remark + GFM, deserialize/serialize
  ...CodeBlockKit,       // fenced code + highlighting
  ...BasicNodesKit,      // headings, lists, quotes, tables, links
  ...CommentKit,         // anchored comments + discussions
  ...SuggestionKit,      // delete / insert / replace suggestions
  ...FloatingToolbarKit, // selection toolbar
  MediaImageKit,         // image attachments only
]
```

Two thin wrappers over the same kit:
- `ReviewEditor` — `readOnly`, floating toolbar offers all four annotation actions.
- `RedlineEditor` — `readOnly`, selection auto-applies a deletion.

> Note: Plate's first-party UI components *are* shadcn registry components, so the editor layer and the surrounding UI element layer share the same Tailwind tokens and theme system with no impedance mismatch.

---

## 8. Architecture

### 8.1 Monorepo

The repo is a **pnpm workspaces** monorepo orchestrated by **Turborepo**. `turbo.json` defines the `build`, `dev`, `lint`, and `test` task graph with caching; `pnpm-workspace.yaml` declares the `apps/*` and `packages/*` globs.

```
symbiot/                          # repo
├── apps/
│   ├── hook/                     # Claude Code / Copilot CLI plugin (behavior unchanged)
│   ├── opencode-plugin/          # OpenCode plugin (behavior unchanged)
│   ├── codex/ · pi-extension/    # other agent integrations
│   ├── paste-service/            # encrypted short-link service (unchanged)
│   ├── portal/                   # static share-viewer site (re-wired to new editor)
│   └── marketing/                # website + docs
├── packages/
│   ├── symbiot-server/           # local server: plan + annotate modes (was `server`)
│   ├── symbiot-editor/           # Plate kit config, ReviewEditor, RedlineEditor (was `plate-editor`)
│   ├── symbiot-annotations/      # annotation data model, serialize/deserialize, share codec
│   ├── symbiot-ui/               # shared shadcn/ui components, ThemeProvider, sidebar, menus
│   └── symbiot-config/           # shared Tailwind preset, tsconfig, eslint config
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

- **Package management & task orchestration:** pnpm + Turborepo.
- **Server runtime:** the local server keeps a fast cold-start runtime (Bun) — it is spawned per-invocation by the CLI plugin, so startup latency matters. This is a runtime choice only; the workspace itself is pnpm/Turbo-managed.
- **Bundling:** Vite, with `vite-plugin-singlefile` for the single-file HTML viewer bundle.
- **CLI command:** `symbiot`. Storage root: `~/.symbiot/`.

### 8.2 UI element layer (Tailwind + shadcn/ui)

- **FR/Arch-1.** All non-document UI — sidebars, top bar, dropdown menus, dialogs, tabs, toggles, tooltips, popovers, the settings panel — SHALL be built from **shadcn/ui** components (Radix primitives under the hood).
- **FR/Arch-2.** shadcn components are vendored into `packages/symbiot-ui` via the shadcn CLI and shared across `apps/portal`, `apps/hook` viewer, and `apps/opencode-plugin` viewer.
- **FR/Arch-3.** A single Tailwind preset in `packages/symbiot-config` defines the design tokens (spacing, radius, color variables) consumed by every app and by Plate's components.
- **FR/Arch-4.** The `ThemeProvider` (in `packages/symbiot-ui`) resolves `system | light | dark`, applies the `.dark` class, and listens for OS preference changes. No framework-specific theming dependency is required (the apps are Vite/Astro, not Next).

### 8.3 Data flow (plan review)

```
Agent exits plan mode
  → hook/tool intercepts, server saves to ~/.symbiot/history/{project}/{slug}/00N.md
  → server detects previous version, starts on a port, opens browser
  → UI GET /api/plan  → { plan, previousPlan?, versionInfo }
  → MarkdownKit deserializes plan → Plate value
  → if previousPlan: @platejs/diff computeDiff() → inline diff nodes
  → reviewer annotates (CommentKit / SuggestionKit marks added to value)
  → Approve / Request changes
  → annotation walker serializes value → feedback markdown
  → POST /api/approve | /api/deny  → server resolves → agent receives decision
```

### 8.4 Read-only vs. suggestion authoring — key technical decision

Plate's docs confirm comment popovers work inside `<Plate readOnly>`. **Suggestion *authoring*, however, was assumed to require a writable editor.** Phase 0 disproved that assumption: `editor.tf.*` transforms bypass the DOM `contenteditable=false` set by `<PlateContent readOnly />` entirely.

- **Pattern A — confirmed.** The editor stays mounted as `<Plate>` with `readOnly={true}` for the entire session. Annotation helpers (`applyAnnotation`, `removeAnnotationMark`) call `editor.tf.addMarks(...)` / `editor.tf.unsetNodes(...)` directly with no readOnly cycling. The reader never has an editable caret experience; the document model is only mutated by annotation APIs.
- **Pattern B — superseded.** "Always editable, locked UI" is unnecessary given Pattern A works without toggling.

OQ-1 resolved by Phase 0 spike (see `plans/00-spike.md` and `plans/README.md` Phase 0 findings).

### 8.5 Annotation data model

```
interface SymbiotDocument {
  markdown: string;             // canonical source
  value: PlateValue;            // derived; not persisted as source of truth
  annotations: Annotation[];    // anchored: comment | deletion | insertion | replacement
  globalComments: GlobalComment[];
  meta: { project, slug, version, totalVersions, createdAt };
}

interface Annotation {
  id: string;
  type: 'comment' | 'deletion' | 'insertion' | 'replacement';
  anchor: PlateAnchor;          // resolvable range in the document tree
  originalText: string;         // selected text snapshot (for export + drift fallback)
  text?: string;                // comment body / inserted / replacement text
  author?: string;
  createdAt: number;
  resolved?: boolean;           // comments only
  images?: ImageAttachment[];
}

interface GlobalComment { id; text; author?; createdAt; images?; }
interface ImageAttachment { path: string; name: string; }
```

- **Persistence / wire format:** markdown + a compact annotation array, matching Plannotator's positional share tuples (`['D', …]`, `['I', …]`, `['R', …]`, `['C', …]`, `['G', …]`). The `symbiot-annotations` codec owns conversion between the rich model and the compact tuple format.
- **Anchor strategy:** anchors are stored as Plate paths/offsets *plus* an `originalText` snapshot. On load, anchors resolve against the tree; if the tree shifted (e.g. a new version), the codec falls back to text-quote matching on `originalText`. This is what makes annotations survive version changes (FR-3, FR-11.5).

### 8.6 Server & integrations

`packages/symbiot-server` keeps **two** modes — **plan** and **annotate** (the code-review mode is dropped, NG2). It serves the documented endpoints (`/api/plan`, `/api/approve`, `/api/deny`, `/api/feedback`, `/api/plan/version[s]`, `/api/plan/history`, `/api/upload`, `/api/image`, `/api/draft`). Filesystem storage layout, Obsidian/Bear/VS Code integrations, image-upload security, and CORS rules are preserved. The only server-side change is that feedback markdown is produced by the new annotation serializer — and since the output format is held constant, that change is invisible to the server's callers.

---

## 9. Non-Functional Requirements

- **NFR-1 Bundle size.** Plate is heavier than the current custom editor. The viewer bundle MUST stay shippable as a single-file HTML (Vite + `vite-plugin-singlefile`). Lazy-load the editor; code-split syntax-highlighting languages. Target: interactive within 1.5s on a typical plan (<50KB markdown).
- **NFR-2 Offline / zero-network.** The share portal MUST remain a fully static page that makes no network calls when rendering a hash URL.
- **NFR-3 Privacy.** No analytics, no tracking, no cookies on the share portal beyond the local theme preference. E2E encryption for short links unchanged.
- **NFR-4 Determinism.** Markdown → Plate → markdown and annotation → feedback serialization MUST be deterministic and idempotent.
- **NFR-5 Accessibility.** Keyboard-navigable selection toolbar and sidebar; annotations reachable and operable without a mouse; WCAG AA contrast on annotation highlight colors in both themes. shadcn/Radix primitives provide baseline a11y.
- **NFR-6 Browser support.** Latest Chrome/Edge/Firefox/Safari. `CompressionStream` is required for sharing.
- **NFR-7 Licensing.** Every editor and UI dependency MUST be MIT/Apache/BSD. No Tiptap Pro, no Liveblocks, no GPL packages.
- **NFR-8 Test coverage.** Markdown round-trip, annotation serialize/deserialize, share codec, and diff computation MUST have unit tests; the four annotation flows MUST have integration tests. Turborepo caches test runs per package.
- **NFR-9 Theming integrity.** No flash of incorrect theme (FOUC) on first paint, in-app or in the static portal.

---

## 10. UX & Design System

symbiot does **not** copy Plannotator's look. It defines its own minimal design system built entirely on shadcn/ui.

- **Design language.** Minimal, neutral, low-chrome. Default shadcn theme tokens; one accent color; `rounded-md` radius; subtle borders over heavy shadows.
- **Reading surface.** No persistent toolbar. The plan renders as a well-typeset document with generous line length and quiet typography. The document area is the focal point; chrome recedes.
- **Top bar.** A slim shadcn bar: mode toggle (`ToggleGroup`: Review / Redline), version indicator, Export `DropdownMenu` (Approve, Request changes, Share, Import Review), Settings button.
- **Selection toolbar.** A small floating `Popover`/toolbar above the selection — four icon+label actions. Disappears on deselect or Escape.
- **Sidebar.** shadcn `Sidebar`, right-aligned, collapsible. Sections via `Tabs` or accordion: Annotations (filterable by type), Global comments, Versions. Annotation counts shown with `Badge`.
- **Composers.** Lightweight `Popover` composers for comment/insert/replace text entry, with image attach. Enter to save, Escape to cancel.
- **Dialogs.** Settings, "clear all", and share/import flows use shadcn `Dialog` / `AlertDialog`.
- **Diff view.** Inline diff is default; raw diff toggled via `Tabs`. Diff additions/removals use the same annotation color tokens for consistency.
- **Annotation color tokens.** `--anno-delete` (red family), `--anno-insert` (green), `--anno-replace` (amber), `--anno-comment` (blue) — each defined for light and dark, each AA-contrast verified. Semantics are consistent; exact hues are symbiot's own, not Plannotator's.
- **Theme toggle.** In Settings: System / Light / Dark, defaulting to System.

---

## 11. Milestones & Phasing

| Phase | Scope | Exit criteria |
|---|---|---|
| **Phase 0 — Spike** | Stand up the pnpm/Turborepo skeleton; Plate with `MarkdownKit` + `CommentKit` + `SuggestionKit`; shadcn + Tailwind + ThemeProvider; validate Pattern A read-only suggestion authoring (OQ-1); validate `@platejs/diff` on real plans | Go/no-go on Plate; read-only annotation pattern proven; theming works |
| **Phase 1 — Core editor** | `symbiot-editor` + `symbiot-annotations`: markdown round-trip, all 5 annotation types, Review + Redline modes, selection toolbar | A plan can be loaded, annotated with every type, and exported to identical-format feedback markdown |
| **Phase 2 — Shell & server wiring** | `symbiot-ui` shadcn shell (top bar, sidebar, version browser, settings, dialogs); wire to `symbiot-server` `/api/*`; image upload; light/dark theming end-to-end | Full plan-review loop works end-to-end against the real server and a real agent |
| **Phase 3 — Diff & versioning** | `@platejs/diff` integration, clean/raw diff views, annotation persistence across versions | UC2 works; legacy `planDiffEngine.ts` removed |
| **Phase 4 — Sharing** | Share codec, hash URLs, encrypted paste integration, Import Review, themed static portal | UC4 works; share format round-trips losslessly; portal has no theme FOUC |
| **Phase 5 — Hardening** | Bundle-size optimization, a11y pass, cross-browser, Turborepo CI caching, test coverage to NFR-8 | All NFRs met; single-file HTML bundle ships |

---

## 12. Risks & Open Questions

| ID | Risk / Question | Mitigation |
|---|---|---|
| **OQ-1** ✅ | Plate Suggestion authoring inside `readOnly` is not explicitly documented. | **Resolved (Phase 0 spike):** Pattern A works without `readOnly` toggling — `editor.tf.*` transforms bypass DOM `contenteditable=false`. See `plans/00-spike.md`. |
| **R-1** | Bundle size regression vs. the lean custom editor; single-file HTML constraint. | Lazy-load editor, code-split highlight languages, measure in Phase 0, budget in NFR-1. |
| **R-2** | Anchor drift: annotations created on version N may not resolve on version N+1. | Dual anchoring (path + `originalText` text-quote fallback) in the codec; tested in Phase 3. |
| **R-3** | Markdown round-trip lossiness for exotic content (HTML blocks, footnotes, frontmatter). | Define a supported-markdown subset (FR-1.2); pass through unknown blocks verbatim; round-trip test suite. |
| **R-4** | `globalComments` are not Plate marks — risk of model split-brain. | Keep them a clearly separate app-level collection; single serializer owns both. |
| **R-5** | Diff-as-suggestions could collide visually/semantically with reviewer-authored suggestions. | Namespace diff nodes distinctly from annotation suggestions; never let a diff node be "accepted" as feedback. |
| **R-6** | Theme FOUC on the static portal (no SSR). | Inline a tiny pre-paint script that reads the stored/system preference and sets the `.dark` class before first render. |
| **R-7** | Naming migration — `plannotator` → `symbiot` touches the CLI command, `~/.plannotator` path, env vars, install scripts, and plugin manifests. | One coordinated rename in Phase 2; provide a one-time migration that reads a legacy `~/.plannotator/` if present. |

---

## 13. Success Metrics

- **M1.** 100% of the five annotation types and both editor modes reproduced (feature parity checklist passes).
- **M2.** Exported feedback markdown is byte-identical in format to Plannotator's for an equivalent annotation set (golden-file tests).
- **M3.** Custom `parser.ts` and `planDiffEngine.ts` fully deleted; net reduction in editor-layer LOC.
- **M4.** Share round-trip is lossless across 100% of the test corpus.
- **M5.** Viewer bundle meets NFR-1 interactive-time target on the reference plan.
- **M6.** Zero paid/non-permissive dependencies in the editor and UI stack.
- **M7.** Light and dark themes pass AA contrast checks across all UI and annotation tokens; no theme FOUC.

---

## 14. Appendix A — Annotation type reference (parity contract)

| Type | Trigger | PlateJS impl | Visual token | Compact tuple | Export form |
|---|---|---|---|---|---|
| Comment | Select span → Comment | Comment mark + discussion | `--anno-comment` | `['C', originalText, text, author?, images?]` | Quoted under anchor text |
| Global comment | Top-bar action, no selection | App collection | sidebar only | `['G', text, author?, images?]` | Dedicated section |
| Deletion | Select span → Delete (or Redline) | Delete suggestion | `--anno-delete` | `['D', originalText, author?, images?]` | Struck text |
| Insertion | Select anchor → Insert → text | Insert suggestion | `--anno-insert` | `['I', contextText, newText, author?, images?]` | "Insert after …" |
| Replacement | Select span → Replace → text | Replace suggestion | `--anno-replace` | `['R', originalText, replacementText, author?, images?]` | "Replace with: …" |

## 15. Appendix B — Server API surface (preserved, plan + annotate only)

**Plan mode:** `GET /api/plan`, `POST /api/approve`, `POST /api/deny`, `GET /api/plan/version`, `GET /api/plan/versions`, `GET /api/plan/history`, `POST /api/plan/vscode-diff`.

**Annotate mode:** `GET /api/plan` (with mode flag), `POST /api/feedback`.

**Shared:** `GET /api/image`, `POST /api/upload`, `GET/POST/DELETE /api/draft`.

_Code-review endpoints (`/api/diff*`, `/api/git-add`, `/api/pr-*`, `/api/ai/*`, `/api/agents/*`) are removed with NG2. Of the retained endpoints, the rewrite changes no signatures; only the producer of feedback-markdown payloads changes, and its output format is held constant by golden-file tests (M2)._

## 16. References

**Source project**
- Plannotator — repository: <https://github.com/backnotprop/plannotator>
- Plannotator — website & docs: <https://plannotator.ai>
- Plannotator — architecture docs: <https://plannotator.ai/docs/>

**Editor framework**
- PlateJS: <https://platejs.org>
- Plate — Comment plugin: <https://platejs.org/docs/comment>
- Plate — Suggestion plugin: <https://platejs.org/docs/suggestion>
- Plate — Markdown plugin: <https://platejs.org/docs/markdown>
- Plate — Static / read-only rendering: <https://platejs.org/docs/static>
- Plate — GitHub: <https://github.com/udecode/plate>

**UI & styling**
- shadcn/ui: <https://ui.shadcn.com>
- Radix UI (primitives): <https://www.radix-ui.com>
- Tailwind CSS: <https://tailwindcss.com>

**Monorepo & build tooling**
- Turborepo: <https://turbo.build/repo>
- pnpm: <https://pnpm.io>
- Vite: <https://vite.dev>
- vite-plugin-singlefile: <https://github.com/richardtallent/vite-plugin-singlefile>
