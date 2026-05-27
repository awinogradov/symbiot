# @symbiot/tailwind-config

Shared Tailwind v4 theme tokens. CSS-first config — no JS/TS preset needed
for Tailwind v4.

## Tokens

- **shadcn semantic tokens** — `--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--card`, `--popover`. Defined for both `:root` (light) and `.dark`.
- **Annotation tokens** — `--anno-delete`, `--anno-insert`, `--anno-replace`, `--anno-comment`. Defined for both themes; AA contrast against `--background` is locked by `contrast.test.ts`.
- **Radius scale** — `--radius` (6px) plus `--radius-{sm,md,lg,xl}`.

## Installation

Workspace dependency — referenced as `"@symbiot/tailwind-config": "workspace:*"`.

## Usage

```css
/* In a consumer's global stylesheet */
@import "@symbiot/tailwind-config/theme.css";
```

## Local development

```sh
bun run test    # runs contrast.test.ts to lock AA contrast on every token
```

To change a hue: edit `theme.css`, run the test, and update the expected
ratio if (and only if) the new value still passes AA. Adding a new token
requires extending `contrast.test.ts`'s `tokens` tuple; adding a theme
requires extending its `themes` tuple.

## Documentation

- [`docs/theming.md`](../../docs/theming.md) — token contract and the WCAG methodology used.
- [`docs/a11y.md`](../../docs/a11y.md) — accessibility baseline.

## License

MIT — see the root [`LICENSE.md`](../../LICENSE.md).
