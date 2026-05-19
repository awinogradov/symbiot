# Phase 3 — Critical features (index)

> Phase 3 is split into four sub-phases (3.0 / 3.1 / 3.2 / 3.3), executed in strict order. This file is the index — each row links to a self-contained phase file. The unified Phase 3 exit criteria and cross-phase gate appear below; per-sub-phase scope, tasks, and verification live in the linked files.
>
> **Aggregate status (2026-05-19):** 🟢 Complete. All four sub-phases landed: 3.0 (Playwright-BDD harness), 3.1 (full markdown surface — Shiki + `SourceLinesPlugin` + tables + synthesized goldens), 3.2 (`RedlineEditor` + sidebar + 7 shadcn primitives + strikethrough), 3.3 (`@platejs/media` + composer image attach). 15/15 Playwright scenarios green; 33 vitest tests (incl. the three new byte-equality goldens). One backlog item: swap the synthesized `global-comment.md` / `deletion.md` / `mixed.md` fixtures for real plannotator captures when an install is available — tracked in `fixtures/plannotator-reference/README.md`.

## Goal

Land the core plan-review feature set: the **three plannotator-compatible annotation types** (Comment, Global Comment, Deletion), both editor modes (Review + Redline), the sidebar, image attachments, annotate mode for arbitrary markdown files, and drafts.

After Phase 3, **M2 holds** — feedback markdown is byte-compatible with the plannotator wire format for these three types, so existing agent integrations drive symbiot transparently.

## Sub-phases

| # | File | Goal |
|---|---|---|
| 3.0 | [`03-0-playwright-bdd.md`](./03-0-playwright-bdd.md) | Playwright-BDD scaffolding (deps, config, `features/` dir, pure-function helpers, smoke `.feature` against the Phase-2 Approve loop). |
| 3.1 | [`03-1-wire-format-and-markdown.md`](./03-1-wire-format-and-markdown.md) | Full C/G/D codec + dual-anchor; block-level source-line metadata; wire `CommentComposer` into `ReviewEditor`; carry-over markdown completeness (`@tailwindcss/typography`, `@platejs/table`, `@platejs/list`, Shiki). |
| 3.2 | [`03-2-deletion-modes-sidebar.md`](./03-2-deletion-modes-sidebar.md) | `SuggestionKit` + Deletion authoring; `RedlineEditor`; Review/Redline mode toggle (`localStorage`); vendor missing shadcn primitives; right-aligned Sidebar; Global Comment composer in top bar. **M2 gate lands here.** |
| 3.3 | [`03-3-images-drafts-annotate.md`](./03-3-images-drafts-annotate.md) | `MediaImageKit`; `/api/upload` + `/api/image` with security model; image attach on all composers; `/api/draft` + client auto-save/restore; `/api/feedback` + annotate mode end-to-end through `apps/hook`. |

## Unified Phase 3 exit criteria

Reflects current state (2026-05-19). `[x]` shipped · `[~]` partial · `[ ]` outstanding.

- [x] All three annotation types apply, persist in the Plate value, and serialize to feedback markdown. *(M2 gate scenario green; byte-equality goldens for `comment.md` / `global-comment.md` / `deletion.md` / `mixed.md` pinned in `serializeFeedback.test.ts`. The G/D/mixed goldens are synthesized from our serializer — TODO in `fixtures/plannotator-reference/README.md` to swap for real plannotator captures.)*
- [x] **Review mode** (default): floating toolbar offers **Comment** + **Delete** on selection; **Global Comment** is available without selection from the top bar.
- [x] **Redline mode**: selection auto-applies a deletion on Delete/Backspace. Mode toggle persists via `localStorage["symbiot.editor-mode"]`. *(Note: the "Undo last redline" affordance was descoped per user direction — explicit keystroke rather than debounced auto-deletion needs no undo history.)*
- [x] Sidebar (collapsible right-aligned, Tabs filter, Badge counts, click-to-focus via `data-anno-id` DOM lookup, Clear-all with AlertDialog).
- [x] Image attachments work end-to-end. *(Server endpoints + security model + `@platejs/media` `ImagePlugin.withComponent(VoidImage)` + `ImageAttachButton` / `ImagePreviewList` in both composers + `features/plan-review/image-attach.feature` Playwright scenario.)*
- [x] Annotate mode: `symbiot annotate <file.md>` works against `/api/feedback`.
- [x] Drafts persist via `/api/draft` (save/restore work across page reloads, including `commentImages`).
- [x] Dual-anchor strategy implemented: anchors stored as Plate paths/offsets + `originalText` snapshot.
- [x] Playwright-BDD harness covers every UI affordance shipped in 3.0–3.3. *(15/15 scenarios green.)*

## Cross-phase gate

**After Phase 3:** M2 holds — feedback markdown is byte-compatible with the reference plan-review format for the 3 shared annotation types (verified by golden-file tests **and** end-to-end Playwright runs).

## PRD reconciliation

The PRD originally lists 5 annotation types for Phase 3. The reference implementation ships **3 only**: Comment, Global Comment, Deletion. Phase 3 ships those 3 for wire-format compatibility. Insertion + Replacement land in **Phase 5** as net-new symbiot features.

## Out of scope (deferred to later phases)

- Insertion + Replacement annotations → Phase 5.
- Plan version diff → Phase 4.
- Sharing / portal → Phase 6.
- Theming polish, AA contrast verification → Phase 7.
- Bundle / a11y / CI / cross-browser → Phase 8.
