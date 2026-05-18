import type { Linter } from "eslint";
import prettierConfig from "eslint-config-prettier";

/**
 * Disables ESLint formatting rules that conflict with Prettier. Always
 * appended last by `configure()` so it wins against upstream presets.
 */
export function getPrettierConfig(): Linter.Config[] {
  return [prettierConfig];
}
