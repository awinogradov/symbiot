/**
 * @module EditorErrorBoundary
 * Error boundary around the lazily-loaded editor / diff panes. When the viewer
 * is served as a multi-chunk build, the Plate `editor` chunk is fetched on
 * demand; a network failure (or any render error inside Plate) would otherwise
 * propagate up and blank the whole review screen. This boundary catches it and
 * renders an inline fallback so the topbar and sidebar stay usable.
 *
 * React exposes no functional error-boundary API (`getDerivedStateFromError`
 * has no hook equivalent), so a class component is required here — the one
 * sanctioned exception to the functional-component rule.
 */

import { Component, type ReactNode } from "react";

/** Props for {@link EditorErrorBoundary}. */
interface EditorErrorBoundaryProps {
  /** Rendered in place of the children once a descendant throws. Defaults to an inline reload prompt. */
  fallback?: ReactNode;
  children: ReactNode;
}

/** Tracks whether a descendant has thrown. */
interface EditorErrorBoundaryState {
  hasError: boolean;
}

const defaultFallback = (
  <div
    role="alert"
    className="text-muted-foreground prose prose-neutral dark:prose-invert max-w-3xl text-sm"
  >
    The editor failed to load. Reload the page to try again.
  </div>
);

export class EditorErrorBoundary extends Component<
  EditorErrorBoundaryProps,
  EditorErrorBoundaryState
> {
  state: EditorErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): EditorErrorBoundaryState {
    return { hasError: true };
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return this.props.fallback ?? defaultFallback;
  }
}
