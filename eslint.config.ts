import { configure, rulesets } from "@symbiot/eslint-config";

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
    rules: {
      "no-restricted-syntax": [
        "error",
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
          selector:
            "CallExpression[callee.object.name='globalThis'][callee.property.name='setTimeout']",
          message:
            "Time-based waits are banned in e2e (issue #131) — `globalThis.setTimeout` bypass is also banned.",
        },
      ],
    },
  },
];
