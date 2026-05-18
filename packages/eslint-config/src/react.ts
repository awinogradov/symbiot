// eslint-plugin-jsx-a11y ships no types; cast through unknown at the import
// boundary so the rest of this file stays strictly typed.
// @ts-expect-error -- no type declarations for eslint-plugin-jsx-a11y
import pluginJsxA11yRaw from "eslint-plugin-jsx-a11y";
import eslintReact from "@eslint-react/eslint-plugin";
import type { ESLint, Linter } from "eslint";
import pluginReactHooksRaw from "eslint-plugin-react-hooks";

import { typescriptFiles } from "./constants.ts";

const pluginJsxA11y = pluginJsxA11yRaw as unknown as ESLint.Plugin;
const pluginReactHooks = pluginReactHooksRaw as unknown as ESLint.Plugin;

/**
 * React 19 + hooks + jsx-a11y rule set. Built on the `recommended-typescript`
 * preset from @eslint-react/eslint-plugin.
 */
export function getReactConfig(): Linter.Config[] {
  const recommended = eslintReact.configs["recommended-typescript"] as {
    plugins: Record<string, ESLint.Plugin>;
    rules: Linter.RulesRecord;
  };
  return [
    {
      name: "@symbiot/react",
      files: typescriptFiles,
      plugins: {
        ...recommended.plugins,
        "react-hooks": pluginReactHooks,
        "jsx-a11y": pluginJsxA11y,
      },
      rules: {
        ...recommended.rules,
        ...(pluginReactHooks.configs?.recommended as { rules: Linter.RulesRecord }).rules,
        ...(pluginJsxA11y.configs?.recommended as { rules: Linter.RulesRecord }).rules,
        "@eslint-react/no-array-index-key": "error",
      },
    },
  ];
}
