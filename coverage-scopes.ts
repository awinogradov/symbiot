/**
 * Single source of truth for which files are unit-tested vs BDD-tested.
 * `vitest.config.ts` and `mcr.config.ts` both import from here, so the two
 * coverage gates stay complementary by construction.
 *
 * Ownership rules:
 * - **Unit** owns `packages/symbiot-*` (per NFR-8 + #123/#125), minus the
 *   excluded contenteditable Plate surfaces and the restyled shadcn primitives.
 * - **BDD** owns `apps/viewer/src/**` (the only surface that mounts the real
 *   viewer) plus the two Plate `contenteditable` surfaces (`DiffEditor`,
 *   `ReviewEditor`) that unit explicitly cannot cover.
 *
 * No file should be in both sets. Because BDD ownership is a small explicit
 * whitelist (`isBddOwned`) and unit ownership is glob-driven, adding a new
 * `packages/symbiot-*` file is automatically unit-only — no manual sync.
 */

/** Vitest `coverage.include` — files the unit gate measures. */
export const unitInclude: readonly string[] = [
  "packages/symbiot-agent-runtime/src/**/*.ts",
  "packages/symbiot-annotations/src/**/*.ts",
  "packages/symbiot-editor/src/utils/**/*.ts",
  "packages/symbiot-editor/src/components/**/*.{ts,tsx}",
  "packages/symbiot-ui/src/components/**/*.{ts,tsx}",
];

/**
 * Vitest `coverage.exclude` — surfaces that look like they'd be unit-covered
 * by the include globs above but are deliberately carved out. The contenteditable
 * Plate surfaces flip into BDD ownership via {@link isBddOwned}; the shadcn
 * primitives are intentionally uncovered by either gate.
 */
export const unitExclude: readonly string[] = [
  "**/*.test.ts",
  "**/*.test.tsx",
  "**/*.d.ts",
  "**/index.ts",
  // Underscore-prefixed siblings are test-only helpers, never shipped.
  "**/_*.{ts,tsx}",
  "packages/symbiot-editor/src/utils/shiki.ts",
  // Code-syntax decorate glue — needs a live Plate editor + async Shiki
  // highlighter; the pure offset/colour math it wires in lives in
  // `codeTokens.ts` (unit-tested), the editor integration is BDD-owned.
  "packages/symbiot-editor/src/utils/codeSyntax.ts",
  "packages/symbiot-editor/src/utils/sourceLines.ts",
  "packages/symbiot-editor/src/utils/typingGuard.ts",
  "packages/symbiot-editor/src/utils/selectionRect.ts",
  // Plate/Slate `contenteditable` surfaces — flip into BDD ownership.
  "packages/symbiot-editor/src/components/DiffEditor.tsx",
  "packages/symbiot-editor/src/components/ReviewEditor.tsx",
  // Restyled shadcn primitives — track upstream, no project logic to gate.
  "packages/symbiot-ui/src/components/Button.tsx",
  "packages/symbiot-ui/src/components/Card.tsx",
  "packages/symbiot-ui/src/components/Dialog.tsx",
  "packages/symbiot-ui/src/components/DropdownMenu.tsx",
  "packages/symbiot-ui/src/components/Input.tsx",
  "packages/symbiot-ui/src/components/Popover.tsx",
  "packages/symbiot-ui/src/components/ScrollArea.tsx",
  "packages/symbiot-ui/src/components/Separator.tsx",
  "packages/symbiot-ui/src/components/Sheet.tsx",
  "packages/symbiot-ui/src/components/Skeleton.tsx",
  "packages/symbiot-ui/src/components/Tabs.tsx",
  "packages/symbiot-ui/src/components/Textarea.tsx",
  "packages/symbiot-ui/src/components/ToggleGroup.tsx",
  "packages/symbiot-ui/src/components/Tooltip.tsx",
  "packages/symbiot-ui/src/components/Badge.tsx",
  "packages/symbiot-ui/src/components/AlertDialog.tsx",
  "packages/symbiot-ui/src/components/Sidebar.tsx",
  "packages/symbiot-ui/src/components/SidebarMenu.tsx",
  "packages/symbiot-ui/src/components/SidebarProvider.tsx",
  "packages/symbiot-ui/src/components/SidebarChrome.tsx",
  "packages/symbiot-ui/src/components/SidebarSection.tsx",
];

/**
 * Plate `contenteditable` surfaces — explicitly excluded from the unit gate
 * because `happy-dom` does not implement the editor semantics they rely on.
 * These flip into BDD ownership (they mount in the real viewer).
 */
const bddOwnedContenteditableSurfaces: readonly string[] = [
  "packages/symbiot-editor/src/components/DiffEditor.tsx",
  "packages/symbiot-editor/src/components/ReviewEditor.tsx",
];

/**
 * Predicate used by `mcr.config.ts:sourceFilter` to decide whether a file
 * contributes to the BDD coverage gate. The BDD scope is the *complement* of
 * the unit scope: app-level code plus the contenteditable carve-outs.
 *
 * @param sourcePath - Source path as MCR sees it (e.g. `apps/viewer/src/...`,
 *   `packages/symbiot-editor/src/components/DiffEditor.tsx`). Leading `./`
 *   variants are tolerated.
 */
export const isBddOwned = (sourcePath: string): boolean => {
  const normalized = sourcePath.replace(/^\.\//, "");
  // Either the repo-relative path (`apps/viewer/src/...`) or the viewer-local
  // path (`src/client/...`, `src/server/...`, `src/shared/...`) emitted by the
  // viewer's TypeScript config. Vite sourcemaps can resolve to either shape.
  if (normalized.startsWith("apps/viewer/src/")) return true;
  if (/(?:^|\/)src\/(?:client|server|shared)\//.test(normalized)) return true;
  return bddOwnedContenteditableSurfaces.some((surface) => normalized.endsWith(surface));
};
