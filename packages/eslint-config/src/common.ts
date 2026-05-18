import js from "@eslint/js";
import type { Linter } from "eslint";
import pluginDepend from "eslint-plugin-depend";
import pluginUnicorn from "eslint-plugin-unicorn";

import { javascriptFiles, typescriptDefinitionFiles, typescriptFiles } from "./constants.ts";

/**
 * Base rules applied to every JS/TS file regardless of environment.
 */
export function getCommonConfig(): Linter.Config[] {
  return [
    js.configs.recommended,
    {
      name: "@symbiot/common",
      files: [...javascriptFiles, ...typescriptFiles, ...typescriptDefinitionFiles],
      plugins: {
        depend: pluginDepend,
        unicorn: pluginUnicorn,
      },
      rules: {
        "depend/ban-dependencies": [
          "warn",
          {
            presets: ["native", "microutilities"],
            allowed: [],
          },
        ],
        "prefer-template": "error",
        "prefer-object-has-own": "error",
        "prefer-destructuring": ["error", { array: true, object: true }],
        eqeqeq: ["error", "always", { null: "ignore" }],
        "no-param-reassign": ["error", { props: false }],
        "no-throw-literal": "error",
        "prefer-promise-reject-errors": "error",
        "prefer-rest-params": "error",
        "max-depth": ["error", 2],
        complexity: ["error", 5],
        "no-else-return": "error",
        "max-lines-per-function": ["error", { max: 100, skipBlankLines: true, skipComments: true }],
        "no-eval": "error",
        "unicorn/prefer-node-protocol": "error",
        "unicorn/no-abusive-eslint-disable": "error",
        "unicorn/explicit-length-check": "error",
        "unicorn/no-nested-ternary": "error",
        "unicorn/prefer-at": "error",
      },
    },
  ];
}
