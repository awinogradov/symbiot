# @symbiot/typescript-config

Shared TypeScript compiler configs.

| File         | Use case                                                                                 |
| ------------ | ---------------------------------------------------------------------------------------- |
| `base.json`  | ES2022, strict, bundler module resolution. Foundation for the others.                    |
| `react.json` | Extends base; DOM libs, `react-jsx`, unused-locals checks. For browser/React workspaces. |
| `node.json`  | Extends base; Node-only lib set, isolated modules. For Bun/Node workspaces.              |

## Installation

Workspace dependency — referenced as `"@symbiot/typescript-config": "workspace:*"`.

## Usage

```jsonc
// tsconfig.json
{
  "extends": "@symbiot/typescript-config/react.json",
  "include": ["src"],
}
```

## License

MIT — see the root [`LICENSE.md`](../../LICENSE.md).
