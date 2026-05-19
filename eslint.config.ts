import { configure, rulesets } from "@symbiot/eslint-config";

export default configure(
  [
    rulesets.COMMON,
    rulesets.TYPESCRIPT,
    rulesets.NODE,
    rulesets.BROWSER,
    rulesets.REACT,
    rulesets.VITEST,
  ],
  { tsconfigRootDir: import.meta.dirname }
);
