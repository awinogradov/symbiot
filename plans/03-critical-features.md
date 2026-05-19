# Phase 3 — Critical features (index)

> Phase 3 is split into four sub-phases (3.0 / 3.1 / 3.2 / 3.3), executed in strict order. This file is the index — each row links to a self-contained phase file. The unified Phase 3 exit criteria and cross-phase gate appear below; per-sub-phase scope, tasks, and verification live in the linked files.
>
> **Aggregate status (2026-05-19):** 🟡 In progress. 3.0 🟢 complete. 3.1 🟡 partial (codec + composer + GFM + typography shipped; Shiki / `SourceLinesPlugin` / table-rule wiring / golden-fixture capture outstanding). 3.2 🟡 M2 gate passed (Comment + Deletion + Global-Comment authoring shipped; `RedlineEditor` + mode toggle + sidebar + shadcn primitives outstanding). 3.3 🟡 server-side complete (`/api/upload` `/api/image` `/api/draft` `/api/feedback` + drafts + annotate-mode CLI all shipped; image composer UI outstanding). 14/14 Playwright scenarios + 32 vitest tests green.

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

- [~] All three annotation types apply, persist in the Plate value, and serialize to feedback markdown. *(M2 gate scenario passes via `toContain` checks; byte-equality goldens for `global-comment.md` / `deletion.md` / `mixed.md` still need capture from a real plannotator session.)*
- [x] **Review mode** (default): floating toolbar offers **Comment** + **Delete** on selection; **Global Comment** is available without selection from the top bar.
- [ ] **Redline mode**: selection auto-applies a deletion; an "Undo last redline" affordance is present. Mode toggle persists via `localStorage`. *(Outstanding — Phase 3.2 follow-up.)*
- [ ] Sidebar (collapsible right-aligned, Tabs filter, Badge counts, click-to-focus, Clear-all with AlertDialog). *(Outstanding — Phase 3.2 follow-up; needs the missing shadcn primitives first.)*
- [~] Image attachments work end-to-end. *(Server endpoints + security model shipped; editor void-image rendering + composer attach UI outstanding — Phase 3.3 follow-up.)*
- [x] Annotate mode: `symbiot annotate <file.md>` works against `/api/feedback`.
- [x] Drafts persist via `/api/draft` (save/restore work across page reloads).
- [x] Dual-anchor strategy implemented: anchors stored as Plate paths/offsets + `originalText` snapshot.
- [~] Playwright-BDD harness covers every UI affordance shipped in 3.0–3.3. *(14/14 scenarios green for what's shipped; image-attach scenario lands when the UI lands.)*

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
