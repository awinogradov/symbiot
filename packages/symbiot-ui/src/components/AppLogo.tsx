/**
 * @module AppLogo
 * Symbiot brand mark. Renders the bare symbol as an inline SVG that inherits
 * color from `currentColor`, so it themes via the surrounding `text-*` class.
 *
 * @example
 * ```tsx
 * <AppLogo size={20} className="text-foreground" />
 * ```
 */

/** Props for the AppLogo component */
export interface AppLogoProps {
  /** Logo size in pixels (rendered as a square). Default 20. */
  size?: number;
  /** Tailwind classes applied to the SVG; use `text-*` to set stroke color. */
  className?: string;
}

const strokeWidthFor = (size: number): number => {
  if (size <= 16) return 1.6;
  if (size <= 24) return 2;
  return 2.4;
};

/** Symbiot logo — bare symbol that themes via `currentColor`. */
export const AppLogo = ({ size = 20, className }: AppLogoProps): React.ReactElement => (
  <svg
    width={size}
    height={size}
    viewBox="5 0 14 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidthFor(size)}
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className={className}
  >
    <line x1="12" y1="2" x2="12" y2="6.5" />
    <polyline points="7,6.5 12,13 17,6.5" />
    <polyline points="7,13 12,19.5 17,13" />
    <line x1="12" y1="19.5" x2="12" y2="23" />
  </svg>
);
