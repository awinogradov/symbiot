# @symbiot/ui

Shared React UI: shadcn/ui components + `ThemeProvider`, sidebar, top bar, selection toolbar.

Wraps shadcn primitives with symbiot tokens from `@symbiot/tailwind-config`.

## Surfaces

- `ThemeProvider`, `TopBar`, `AppLogo`, `SidebarInset`, `SidebarProvider`.
- `AnnotationSidebar` — right-hand pane. Two tabs (Annotations + History)
  appear when ≥2 plan versions exist; otherwise it falls back to the
  single-purpose annotation list. The History tab hosts a `VersionBrowser`
  (newest-first list of persisted versions) and a Clean / Raw `ToggleGroup`
  that controls the editor's diff render mode. The toggle is rendered only
  when a historical version is active _and_ a predecessor exists. See
  [`../../docs/version-history.md`](../../docs/version-history.md#sidebar-layout).
- `CommentComposer`, `GlobalCommentComposer`, `GlobalCommentFab`,
  `ComposerForm`, `ImageAttachButton`, `ImagePreviewList` for annotation
  authoring.
- Re-exported shadcn primitives (`Sidebar`, `Tabs`, `ToggleGroup`,
  `AlertDialog`, `Badge`, `Tooltip`, `DropdownMenu`, ...) backed by Radix.

Per-phase scope and status live in
[`../../plans/README.md`](../../plans/README.md).

## Scripts

- `bun run typecheck`
- `bun run lint`
- `bun run test`
