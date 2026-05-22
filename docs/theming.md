# Theming — annotation hues & AA contrast

Annotation tokens in `packages/tailwind-config/theme.css` carry the four
mark/highlight kinds (`--anno-delete`, `--anno-insert`, `--anno-replace`,
`--anno-comment`). This doc records the chosen OKLCH value, hex equivalent,
and measured WCAG 2.1 contrast ratio against `--background` for each
`(token, theme)` pair, along with the methodology used so the values are
reproducible.

The translucent backgrounds (`bg-anno-*/10`) are decorative — only the
foreground `text-anno-*` color is contrast-verified.

## Values

### Light theme — `--background: oklch(1 0 0)` (≈ `#ffffff`)

| Token            | OKLCH                 | Hex       | Ratio    |
| ---------------- | --------------------- | --------- | -------- |
| `--anno-delete`  | `oklch(0.5 0.2 25)`   | `#bb061e` | 6.65:1 ✓ |
| `--anno-insert`  | `oklch(0.5 0.14 148)` | `#0c7830` | 5.61:1 ✓ |
| `--anno-replace` | `oklch(0.52 0.1 75)`  | `#8a5f18` | 5.63:1 ✓ |
| `--anno-comment` | `oklch(0.54 0.13 48)` | `#a9531e` | 5.33:1 ✓ |

### Dark theme — `--background: oklch(0.145 0 0)` (≈ `#252525`)

| Token            | OKLCH                  | Hex       | Ratio    |
| ---------------- | ---------------------- | --------- | -------- |
| `--anno-delete`  | `oklch(0.7 0.18 30)`   | `#fa6a57` | 5.30:1 ✓ |
| `--anno-insert`  | `oklch(0.75 0.18 145)` | `#57cb60` | 7.38:1 ✓ |
| `--anno-replace` | `oklch(0.78 0.16 75)`  | `#f2a618` | 7.48:1 ✓ |
| `--anno-comment` | `oklch(0.75 0.14 50)`  | `#f49157` | 6.59:1 ✓ |

All eight pairs clear the WCAG AA threshold for normal-weight text (4.5:1).

## Differentiation from `--destructive`

The shadcn `--destructive` token sits in the red family (`oklch(0.577 0.245
27.325)` light, `oklch(0.704 0.191 22.216)` dark). `--anno-delete` is
deliberately distinct so reviewers don't confuse the two surfaces:

- **Light.** `--destructive` resolves to `#e7000b` (a vivid pure red);
  `--anno-delete` to `#bb061e` — meaningfully darker (L 0.500 vs 0.577) so
  buttons and badges read as separate UI from struck-through deletion text.
- **Dark.** `--destructive` resolves to `#ff6467` (pink-red, hue 22°);
  `--anno-delete` to `#fa6a57` — hue shifted ~8° toward orange so a
  destructive button and an annotation deletion never look like the same
  surface.

## Methodology

Each ratio is computed with the WCAG 2.1 relative-luminance formula
([W3C reference](https://www.w3.org/TR/WCAG21/relative-luminance.html)):

1. Convert each sRGB channel from `[0, 255]` to `[0, 1]`.
2. Linearize: if `c ≤ 0.04045`, `c_lin = c / 12.92`; otherwise
   `c_lin = ((c + 0.055) / 1.055) ** 2.4`.
3. Relative luminance `L = 0.2126·R_lin + 0.7152·G_lin + 0.0722·B_lin`.
4. Contrast ratio `(max(L1, L2) + 0.05) / (min(L1, L2) + 0.05)`.

OKLCH → sRGB conversion uses Björn Ottosson's reference matrix
([Oklab — A perceptual color space](https://bottosson.github.io/posts/oklab/))
followed by sRGB gamma encoding (the inverse of step 2 above). Each chosen
triple is verified to be inside the sRGB gamut so the browser-rendered color
matches the spec exactly — no implementation-dependent gamut-mapping.

Any tool that implements the same pipeline reproduces these hex values and
ratios: `oklch.com`, the `culori` npm package, or a 30-line script using the
formulas above.

## Cross-references

- Phase plan: [`../plans/07-theming.md`](../plans/07-theming.md).
- Phase 7.4 ([symbiot#52](https://github.com/awinogradov/symbiot/issues/52))
  lands the automated contrast unit test that locks these values in and
  formally closes the **M7** cross-phase gate.
- PRD requirement: **FR-14.5** (annotation hues meet AA in both themes).
- Token definitions: [`../packages/tailwind-config/theme.css`](../packages/tailwind-config/theme.css).
