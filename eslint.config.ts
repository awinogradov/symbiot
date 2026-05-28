import { configure, rulesets } from "@symbiot/eslint-config";
import playwright from "eslint-plugin-playwright";

/**
 * Time-based waits are banned in e2e (issue #131). Shared so the step-file
 * config can re-apply them alongside the selector rules — a second
 * `no-restricted-syntax` entry would otherwise replace, not merge with, this
 * one (ESLint flat config resolves a rule by last matching config).
 */
const featuresNoTimingSelectors = [
  {
    selector: "CallExpression[callee.property.name='waitForTimeout']",
    message:
      "Time-based waits are banned in e2e (issue #131). Wait on a selector, an assertion, or `waitForFunction`. See features/README.md.",
  },
  {
    selector: "CallExpression[callee.name='setTimeout']",
    message:
      "Time-based waits are banned in e2e (issue #131). Wait on a selector, an assertion, or `waitForFunction`. See features/README.md.",
  },
  {
    selector: "CallExpression[callee.object.name='globalThis'][callee.property.name='setTimeout']",
    message:
      "Time-based waits are banned in e2e (issue #131) — `globalThis.setTimeout` bypass is also banned.",
  },
];

/**
 * BDD step files MUST select via `data-testid` (issue #132). Bans every
 * non-testid Playwright getter and any `.locator("…")` whose string literal
 * does not target a `[data-testid…]` attribute. Template-literal locators are
 * out of scope until a real violation surfaces.
 */
const featuresTestidOnlySelectors = [
  {
    selector:
      "CallExpression[callee.property.name=/^getBy(Role|Text|Label|AltText|Title|PlaceholderText|DisplayValue)$/]",
    message:
      "BDD steps must select via data-testid (issue #132). Use page.getByTestId(...) instead. See docs/testing.md#playwright-bdd-selectors.",
  },
  {
    selector:
      "CallExpression[callee.property.name='locator'] > Literal[value!=/^\\[data-testid([\\^$*]?=)/]",
    message:
      "BDD steps must select via data-testid (issue #132). .locator(...) must target '[data-testid=...]'. See docs/testing.md#playwright-bdd-selectors.",
  },
];

export default [
  ...configure(
    [
      rulesets.COMMON,
      rulesets.TYPESCRIPT,
      rulesets.NODE,
      rulesets.BROWSER,
      rulesets.REACT,
      rulesets.VITEST,
    ],
    { tsconfigRootDir: import.meta.dirname }
  ),
  {
    name: "symbiot/features-no-timing",
    files: ["features/**/*.ts"],
    ignores: ["features/steps/**/*.ts"],
    rules: {
      "no-restricted-syntax": ["error", ...featuresNoTimingSelectors],
    },
  },
  {
    name: "symbiot/features-testid-only",
    files: ["features/steps/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...featuresNoTimingSelectors,
        ...featuresTestidOnlySelectors,
      ],
    },
  },
  {
    ...playwright.configs["flat/recommended"],
    name: "symbiot/features-playwright",
    files: ["features/**/*.ts"],
    rules: {
      ...playwright.configs["flat/recommended"].rules,
      "playwright/no-focused-test": "off",
      "playwright/no-skipped-test": "off",
      "playwright/no-wait-for-timeout": "off",
      // playwright-bdd assertions live in Given/When/Then step callbacks, not
      // `test()` blocks, so the preset's standalone-expect ban does not apply.
      "playwright/no-standalone-expect": "off",
    },
  },
];
