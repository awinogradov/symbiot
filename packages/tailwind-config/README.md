# @symbiot/tailwind-config

Shared Tailwind v4 theme tokens. CSS-first config — no JS/TS preset needed for Tailwind v4.

## Tokens

- **shadcn semantic tokens** — `--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--card`, `--popover`. Defined for both `:root` (light) and `.dark`.
- **Annotation tokens** (PRD §10) — `--anno-delete`, `--anno-insert`, `--anno-replace`, `--anno-comment`. Defined for both themes with **placeholder hues**; AA-contrast verification lands in **Phase 7**.
- **Radius scale** — `--radius` (6px) plus `--radius-{sm,md,lg,xl}`.

## Usage

```css
/* In a consumer's global stylesheet */
@import "@symbiot/tailwind-config/theme.css";
```
