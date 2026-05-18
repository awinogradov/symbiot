import type { Linter } from "eslint";
import pluginN from "eslint-plugin-n";
import globals from "globals";

import { javascriptFiles, typescriptFiles } from "./constants.ts";

/**
 * Node.js-flavoured rules: node globals, eslint-plugin-n quality rules
 * (no-sync, prefer-promises/fs), and a restriction on raw `process.env` /
 * `import.meta.env` access outside `src/config/`.
 */
export function getNodeConfig(): Linter.Config[] {
  return [
    {
      name: "@symbiot/node",
      files: [...javascriptFiles, ...typescriptFiles],
      plugins: { n: pluginN },
      languageOptions: {
        globals: {
          ...globals.node,
        },
      },
      rules: {
        "n/no-sync": "error",
        "n/prefer-promises/fs": "error",
      },
    },
    {
      name: "@symbiot/node/env-access",
      files: ["src/**/*.{ts,tsx}"],
      ignores: ["**/config/**/*"],
      rules: {
        "no-restricted-syntax": [
          "error",
          {
            selector:
              "MemberExpression[object.object.name='process'][object.property.name='env'][property.name!='NODE_ENV']",
            message:
              "Direct access to process.env is not allowed outside src/config/. Import from centralized config instead. Exception: NODE_ENV is allowed everywhere.",
          },
          {
            selector:
              "MemberExpression[object.object.object.property.name='meta'][object.object.property.name='env']",
            message:
              "Direct access to import.meta.env is not allowed outside src/config/. Import from centralized config instead.",
          },
        ],
      },
    },
  ];
}
