# @symbiot/portal

Static, single-file viewer for shared review links. Loads a plan plus
annotations from the URL hash (compressed + base64url, optionally
AES-256-GCM encrypted), then renders read-only Plate.

## Status

Not yet released — the package currently exports nothing. The viewer
side of the share flow (export → encode → URL → import) ships first; the
portal app then consumes the same encoded payload from a hash URL.

## Local development

```sh
bun run typecheck
bun run lint
bun run test
```

## Documentation

- [`docs/product.md`](../../docs/product.md) — sharing goal (G6).
- [`docs/architecture.md`](../../docs/architecture.md) — portal's place in the monorepo.

## License

MIT — see the root [`LICENSE.md`](../../LICENSE.md).
