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
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.d.ts",
        "**/index.ts",
        "packages/symbiot-editor/src/utils/shiki.ts",
        "packages/symbiot-editor/src/utils/sourceLines.ts",
        "packages/symbiot-editor/src/utils/typingGuard.ts",
        "packages/symbiot-editor/src/utils/selectionRect.ts",
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
