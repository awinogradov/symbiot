# @symbiot/ui

Shared React UI: shadcn/ui components, `ThemeProvider`, the top bar, the
right-hand annotation sidebar, the global-comment composer, and the
annotation authoring popovers.

Wraps shadcn primitives with the symbiot design tokens from
[`@symbiot/tailwind-config`](../tailwind-config/README.md).

## Surfaces

- `ThemeProvider`, `TopBar`, `SettingsMenu`, `AppLogo`, `SidebarInset`, `SidebarProvider`.
- `AnnotationSidebar` — right-hand pane. Two tabs (Annotations + History) appear when ≥2 plan versions exist; otherwise it falls back to the single-purpose annotation list. The History tab hosts a `VersionBrowser` (newest-first list of persisted versions) and a Clean / Raw `ToggleGroup` that controls the editor's diff render mode. The toggle is rendered only when a historical version is active _and_ a predecessor exists. See [`docs/04-version-history.md`](../../docs/04-version-history.md).
- `AnnotationComposer`, `GlobalCommentFab`, `ComposerForm`, `ImageAttachButton`, `ImagePreviewList` — annotation authoring popovers.
- Re-exported shadcn primitives (`Sidebar`, `Tabs`, `ToggleGroup`, `AlertDialog`, `Badge`, `Tooltip`, `DropdownMenu`, ...) backed by Radix.

## Architecture

```
                       ┌──────────────────────────┐
                       │  ThemeProvider           │
                       │   system | light | dark  │
                       └────────────┬─────────────┘
                                    │
            ┌──────────────────────┴──────────────────────┐
            │                                              │
   ┌────────▼─────────┐                          ┌────────▼─────────┐
   │  TopBar          │                          │ SidebarProvider  │
   │   SettingsMenu   │                          │   ├─ Annotations │
   │    DropdownMenu  │                          │   └─ History     │
   │                  │                          │       VersionBrowser
   └──────────────────┘                          │       ToggleGroup
                                                 └──────────────────┘

   Composers (popovers):
     AnnotationComposer · GlobalCommentFab · ImageAttachButton
```

## Installation

Workspace dependency — referenced as `"@symbiot/ui": "workspace:*"` from
`apps/viewer`, `apps/portal`, and `@symbiot/editor`.

## Usage

```tsx
import { ThemeProvider, TopBar, AnnotationSidebar } from "@symbiot/ui";

<ThemeProvider defaultTheme="system">
  <TopBar mode="review" onModeChange={setMode} />
  <AnnotationSidebar entries={entries} diffMode={diffMode} {...} />
</ThemeProvider>
```

## Local development

```sh
bun run typecheck
bun run lint
bun run test
```

## Documentation

- [`docs/05-theming.md`](../../docs/05-theming.md) — annotation color tokens and the AA contrast lock.
- [`docs/06-a11y.md`](../../docs/06-a11y.md) — keyboard, focus, and screen-reader baseline.
- [`docs/02-architecture.md`](../../docs/02-architecture.md) — package layering.

## License

MIT — see the root [`LICENSE.md`](../../LICENSE.md).
