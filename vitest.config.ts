import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    conditions: ["source"],
  },
  test: {
    exclude: [
      "**/node_modules/**",
      "**/.git/**",
      "**/dist/**",
      "apps/**",
      ".features-generated/**",
    ],
    environment: "node",
    setupFiles: ["./vitest.setup.js"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "json", "html", "lcov"],
      reportOnFailure: true,
      include: [
        "packages/symbiot-annotations/src/**/*.ts",
        "packages/symbiot-editor/src/utils/**/*.ts",
        "packages/symbiot-editor/src/components/**/*.{ts,tsx}",
        "packages/symbiot-ui/src/components/**/*.{ts,tsx}",
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.d.ts",
        "**/index.ts",
        // Underscore-prefixed siblings are test-only helpers, never shipped.
        "**/_*.{ts,tsx}",
        "packages/symbiot-editor/src/utils/shiki.ts",
        "packages/symbiot-editor/src/utils/sourceLines.ts",
        "packages/symbiot-editor/src/utils/typingGuard.ts",
        "packages/symbiot-editor/src/utils/selectionRect.ts",
        // Plate/Slate `contenteditable` surfaces — testing them needs a live
        // Plate editor with `contenteditable` semantics happy-dom does not
        // implement. Exercised by Playwright-BDD specs against the real
        // viewer app. Keep this list narrow; everything else under
        // `components/**` must be unit-testable.
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
      ],
      thresholds: {
        lines: 90,
        statements: 90,
        branches: 90,
        functions: 90,
      },
    },
  },
});
