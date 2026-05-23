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

## Automated contrast test

`packages/tailwind-config/contrast.test.ts` locks every annotation token's
contrast against `--background` at the WCAG AA threshold (>= 4.5:1) in both
light and dark themes. Each test case reads the actual `theme.css` cascade
through JSDOM by toggling the `.dark` class on `document.documentElement`,
so a hue edit that drops below AA fails CI before review.

JSDOM was picked over a headless browser because the assertion is a values
check — there is no rendered fixture to inspect — and spinning Playwright
up for that costs seconds per case. `axe-core` on a rendered fixture is the
other published option; it operates one level higher (rendered element +
font-weight rules) than needed here and stays available for a future
end-to-end a11y pass.

The WCAG 2.1 relative-luminance formula spelled out in [Methodology](#methodology)
is inlined in the test rather than imported from `wcag-contrast`. The
library accepts only sRGB inputs, so the OKLCH parser and Björn Ottosson
matrix would still be hand-rolled — collapsing both into ~40 lines of
inline math keeps the test a single file with the formula visible at the
call site.

The four tokens cover all five annotation kinds: `--anno-comment` is shared
between Comment and Global Comment (Global Comment carries no anchored
span, so the foreground-on-`--background` requirement still applies to the
composer surface). Run with:

```sh
bun --filter @symbiot/tailwind-config test
```

Adding a new annotation token to `theme.css` requires extending the test's
`tokens` tuple; adding a new theme requires extending the `themes` tuple.

## Cross-references

- Phase plan: [`../plans/07-theming.md`](../plans/07-theming.md).
- Phase 7.4 ([symbiot#52](https://github.com/awinogradov/symbiot/issues/52))
  lands the automated contrast unit test that locks these values in and
  formally closes the **M7** cross-phase gate.
- PRD requirement: **FR-14.5** (annotation hues meet AA in both themes).
- Token definitions: [`../packages/tailwind-config/theme.css`](../packages/tailwind-config/theme.css).

## Dark-mode variant (class-based)

Tailwind v4 ships the `dark:` variant wired to `@media (prefers-color-scheme:
dark)` by default. symbiot uses class-based theming — `ThemeProvider` toggles
`.dark` on `<html>` based on the resolved `system | light | dark` choice — so
the variant is rewired in [`../packages/tailwind-config/theme.css`](../packages/tailwind-config/theme.css):

```css
@custom-variant dark (&:where(.dark, .dark *));
```

Class-based wins because it keeps `dark:` utilities in lock-step with the
`.dark` toggle and the `:root` / `.dark` CSS-variable cascade. With the media
default, a user on an OS that reports `prefers-color-scheme: dark` who then
selects **Light** would still see `dark:`-prefixed utilities activate — most
visibly `dark:prose-invert` on the editor wrapper, which flips
`--tw-prose-body` to `neutral-300` and `--tw-prose-bold` / `--tw-prose-code`
to `white`, producing washed-out body text and invisible bold/inline code on
a white background (regression filed as [symbiot#93](https://github.com/awinogradov/symbiot/issues/93)).
Class-based variant resolution makes an explicit user-selected Light override
OS Dark, satisfying **FR-14.3**. The
[`contrast.test.ts`](../packages/tailwind-config/contrast.test.ts) suite
locks the directive shape so a formatting drift fails CI before review.

See [`ThemeProvider.tsx`](../packages/symbiot-ui/src/components/ThemeProvider.tsx)
for the `.dark` toggle source of truth.
