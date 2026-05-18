import type { Linter } from "eslint";
import globals from "globals";

import { javascriptFiles, typescriptFiles } from "./constants.ts";

/**
 * Declares browser + ES2025 globals for front-end code.
 */
export function getBrowserConfig(): Linter.Config[] {
  return [
    {
      name: "@symbiot/browser",
      files: [...javascriptFiles, ...typescriptFiles],
      languageOptions: {
        globals: {
          ...globals.es2025,
          ...globals.browser,
        },
      },
    },
  ];
}
