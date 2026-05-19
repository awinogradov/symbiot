import type { Linter } from "eslint";

import { getBrowserConfig } from "./browser.ts";
import { getCommonConfig } from "./common.ts";
import { typescriptFiles } from "./constants.ts";
import { getIgnoreConfig } from "./ignore.ts";
import { getNodeConfig } from "./node.ts";
import { getPrettierConfig } from "./prettier.ts";
import { getReactConfig } from "./react.ts";
import { getTypescriptConfig } from "./typescript.ts";
import { getVitestConfig } from "./vitest.ts";

type RulesetFactory = () => Linter.Config[];

interface ConfigureOptions {
  /**
   * Absolute directory used as `parserOptions.tsconfigRootDir`. Required
   * when running ESLint from outside the workspace (e.g. lint-staged at the
   * repo root) so typescript-eslint picks the correct tsconfig among
   * multiple workspace candidates. Callers should pass `import.meta.dirname`.
   */
  tsconfigRootDir?: string;
}

/**
 * Named rule-set factories. Pass any subset to `configure()` to compose an
 * ESLint flat config for a workspace.
 */
export const rulesets = {
  COMMON: getCommonConfig,
  TYPESCRIPT: getTypescriptConfig,
  REACT: getReactConfig,
  BROWSER: getBrowserConfig,
  NODE: getNodeConfig,
  VITEST: getVitestConfig,
} as const satisfies Record<string, RulesetFactory>;

/**
 * Compose a flat ESLint config from a list of ruleset factories. Always
 * prepends the shared ignore config and appends the Prettier compatibility
 * config so formatting rules win.
 *
 * @example
 *   import { configure, rulesets } from "@symbiot/eslint-config";
 *   export default configure([
 *     rulesets.COMMON,
 *     rulesets.TYPESCRIPT,
 *     rulesets.REACT,
 *     rulesets.BROWSER,
 *   ], { tsconfigRootDir: import.meta.dirname });
 */
export function configure(list: RulesetFactory[], options: ConfigureOptions = {}): Linter.Config[] {
  const resolved = list.flatMap((factory) => factory());
  const rootDirOverride: Linter.Config[] = options.tsconfigRootDir
    ? [
        {
          name: "@symbiot/tsconfig-root-dir",
          files: typescriptFiles,
          languageOptions: {
            parserOptions: { tsconfigRootDir: options.tsconfigRootDir },
          },
        },
      ]
    : [];
  return [getIgnoreConfig(), ...resolved, ...rootDirOverride, ...getPrettierConfig()];
}
