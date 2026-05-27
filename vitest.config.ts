import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

import { unitInclude, unitExclude } from "./coverage-scopes.ts";

// Resolve the setup file relative to THIS config, not the cwd of the process
// running vitest. Per-package scripts (`bun --filter @symbiot/<pkg> test`)
// run vitest with the package directory as cwd; a bare "./vitest.setup.js"
// would resolve to `packages/<pkg>/vitest.setup.js` and fail to load.
const setupFilePath = fileURLToPath(new URL("./vitest.setup.js", import.meta.url));

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
    setupFiles: [setupFilePath],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "json", "html", "lcov"],
      reportOnFailure: true,
      include: [...unitInclude],
      exclude: [...unitExclude],
      thresholds: {
        lines: 90,
        statements: 90,
        branches: 90,
        functions: 90,
      },
    },
  },
});
