# @symbiot/prettier-config

Shared Prettier configuration. Width 100, 2-space indent, double quotes,
ES5 trailing commas, LF line endings. Ships `prettier-plugin-tailwindcss`.

## Installation

Workspace dependency — referenced as `"@symbiot/prettier-config": "workspace:*"`.

## Usage

In a workspace `package.json`:

```jsonc
{
  "prettier": "@symbiot/prettier-config",
}
```

## Local development

TypeScript source (`src/prettierConfig.ts`) compiles to `dist/` via
`tsc -p tsconfig.build.json`. Root `postinstall` builds it automatically.

## License

MIT — see the root [`LICENSE.md`](../../LICENSE.md).
