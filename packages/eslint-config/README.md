# @symbiot/eslint-config

Shared flat ESLint 10 config. Compose rulesets per workspace via the
`configure()` factory.

## Rulesets

- `COMMON` — base JS/TS rules (depend/unicorn, prefer-template, complexity caps).
- `TYPESCRIPT` — typescript-eslint parser, naming conventions, import-x ordering, JSDoc rules.
- `REACT` — eslint-plugin-react + react-hooks + jsx-a11y (recommended-typescript preset).
- `BROWSER` — browser + ES2025 globals.
- `NODE` — Node globals, `n/no-sync`, restricts raw `process.env` / `import.meta.env` outside `src/config/`.
- `VITEST` — relaxed rules for `*.test.{ts,tsx}` files.

## Installation

Workspace dependency — referenced as `"@symbiot/eslint-config": "workspace:*"`.

## Usage

```ts
// eslint.config.ts
import { configure, rulesets } from "@symbiot/eslint-config";

export default configure([rulesets.COMMON, rulesets.TYPESCRIPT, rulesets.REACT, rulesets.BROWSER], {
  tsconfigRootDir: import.meta.dirname,
});
```

`configure()` always prepends the shared ignore config and appends the
Prettier compatibility config so formatting rules win.

## Local development

The package ships TypeScript sources (`src/eslintConfig.ts`) compiled to
`dist/` by `tsc -p tsconfig.build.json`. Root `postinstall` builds it
automatically; run `bun run --filter ./packages/eslint-config build` to
rebuild manually.

## License

MIT — see the root [`LICENSE.md`](../../LICENSE.md).
