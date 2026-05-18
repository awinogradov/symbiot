import type { Config } from "prettier";

/**
 * Shared Prettier configuration for the symbiot monorepo. Consume via the
 * `"prettier"` key in package.json:
 *
 * @example
 *   // package.json
 *   { "prettier": "@symbiot/prettier-config" }
 */
export const prettierConfig: Config = {
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: false,
  trailingComma: "es5",
  endOfLine: "lf",
  insertPragma: false,
  requirePragma: false,
  plugins: ["prettier-plugin-tailwindcss"],
};

// eslint-disable-next-line import-x/no-default-export -- Prettier's `"prettier": "<pkg>"` resolution reads the default export.
export default prettierConfig;
