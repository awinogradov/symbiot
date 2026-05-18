import { configure, rulesets } from "@symbiot/eslint-config";

export default configure([rulesets.COMMON, rulesets.TYPESCRIPT, rulesets.NODE], {
  tsconfigRootDir: import.meta.dirname,
});
