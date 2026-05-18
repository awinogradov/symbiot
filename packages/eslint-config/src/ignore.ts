import type { Linter } from "eslint";

/**
 * Shared ignore patterns. Mirrors root `.gitignore` + per-package generated
 * artifacts so consumers get sensible defaults without wiring them up manually.
 */
export function getIgnoreConfig(): Linter.Config {
  return {
    name: "@symbiot/ignore",
    ignores: [
      "dist/**",
      "**/dist/**",
      ".output/**",
      ".turbo/**",
      "**/.turbo/**",
      "node_modules/**",
      "**/node_modules/**",
      "bun.lock",
      "coverage/**",
      "**/playwright-report/**",
      "**/test-results/**",
    ],
  };
}
