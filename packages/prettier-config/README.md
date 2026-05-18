# @symbiot/prettier-config

Shared Prettier configuration. Width 100, 2-space indent, double quotes, ES5 trailing commas, LF line endings. Ships `prettier-plugin-tailwindcss`.

## Usage

In a workspace `package.json`:

```jsonc
{
  "prettier": "@symbiot/prettier-config",
}
```

## Build

TypeScript source (`src/prettierConfig.ts`) compiles to `dist/` via `tsc -p tsconfig.build.json`. Root `postinstall` builds it automatically.
