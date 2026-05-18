import type { Linter } from "eslint";

import { specFiles } from "./constants.ts";

/**
 * Relaxed rules for Vitest test files.
 */
export function getVitestConfig(): Linter.Config[] {
  return [
    {
      name: "@symbiot/vitest",
      files: specFiles,
      rules: {
        complexity: "off",
        "max-lines-per-function": "off",
        "max-depth": "off",
        "n/no-sync": "off",
        "jsdoc/require-jsdoc": "off",
        "jsdoc/no-blank-blocks": "off",
        "@typescript-eslint/no-explicit-any": "off",
      },
    },
  ];
}
