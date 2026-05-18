import { fixupPluginRules } from "@eslint/compat";
import type { Linter } from "eslint";
import pluginImportX from "eslint-plugin-import-x";
import pluginJsdoc from "eslint-plugin-jsdoc";
import tseslint from "typescript-eslint";

import { configFiles, typescriptFiles } from "./constants.ts";

/**
 * TypeScript parser setup, naming conventions, import ordering, JSDoc rules,
 * and the config-files default-export exemption.
 */
export function getTypescriptConfig(): Linter.Config[] {
  return [
    ...tseslint.configs.recommended,
    getTypescriptMainConfig(),
    getTypescriptConfigFilesOverride(),
  ];
}

function getTypescriptMainConfig(): Linter.Config {
  return {
    name: "@symbiot/typescript",
    files: typescriptFiles,
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
        projectService: true,
      },
    },
    plugins: {
      "import-x": fixupPluginRules(pluginImportX),
      jsdoc: pluginJsdoc,
    },
    rules: getTypescriptMainRules(),
  };
}

function getTypescriptMainRules(): Linter.RulesRecord {
  return {
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/naming-convention": [
      "error",
      {
        selector: "variable",
        format: ["camelCase", "PascalCase"],
        leadingUnderscore: "allow",
      },
      { selector: "function", format: ["camelCase", "PascalCase"] },
      { selector: "typeLike", format: ["PascalCase"] },
      {
        selector: "interface",
        format: ["PascalCase"],
        custom: { regex: "^I[A-Z]", match: false },
      },
    ],
    "import-x/no-default-export": "error",
    "import-x/prefer-default-export": "off",
    "import-x/order": [
      "error",
      {
        groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
        pathGroups: [{ pattern: "@/**", group: "internal", position: "before" }],
        "newlines-between": "always",
      },
    ],
    "@typescript-eslint/no-unnecessary-type-assertion": "error",
    "@typescript-eslint/consistent-type-assertions": [
      "error",
      {
        assertionStyle: "as",
        objectLiteralTypeAssertions: "allow-as-parameter",
      },
    ],
    "@typescript-eslint/no-unused-expressions": [
      "error",
      { allowShortCircuit: false, allowTernary: true },
    ],
    "@typescript-eslint/return-await": "error",
    "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
    "@typescript-eslint/ban-ts-comment": [
      "error",
      {
        "ts-expect-error": "allow-with-description",
        "ts-ignore": true,
        "ts-nocheck": true,
      },
    ],
    "jsdoc/require-jsdoc": [
      "error",
      {
        publicOnly: true,
        require: {
          FunctionDeclaration: false,
          MethodDefinition: false,
          ClassDeclaration: false,
          ArrowFunctionExpression: false,
          FunctionExpression: false,
        },
        contexts: ["TSInterfaceDeclaration", "TSTypeAliasDeclaration:has(TSTypeLiteral)"],
      },
    ],
    "jsdoc/no-blank-blocks": "error",
  };
}

function getTypescriptConfigFilesOverride(): Linter.Config {
  return {
    name: "@symbiot/typescript/config-files",
    files: configFiles,
    rules: {
      "import-x/no-default-export": "off",
    },
  };
}
