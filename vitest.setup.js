/**
 * @module vitest.setup
 *
 * DOM polyfills for Radix UI primitives under happy-dom plus testing-library
 * auto-cleanup. Loaded for every vitest run; the `typeof window !== "undefined"`
 * guard makes the polyfills and cleanup hook no-ops in the default node
 * environment so pure-function specs are not slowed down.
 *
 * Auto-cleanup is registered here because the repo does not use vitest globals
 * (tests import `describe`/`it` directly), so `@testing-library/react`'s
 * import-time auto-registration of `afterEach(cleanup)` does not fire.
 *
 * Each polyfill exists because a Radix component touches a browser API that
 * happy-dom does not implement. When adding a new stub here, link the Radix
 * issue that motivated it via `@see`.
 *
 * @see https://github.com/capricorn86/happy-dom/issues/1796 — ResizeObserver
 * @see https://github.com/radix-ui/primitives/issues/420 — Tabs/Toggle/Popover pointer-capture in jsdom-likes
 */
import { afterEach } from "vitest";

if (typeof window !== "undefined") {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver ??= ResizeObserverStub;

  if (typeof window.matchMedia !== "function") {
    window.matchMedia = (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }

  if (typeof Element.prototype.scrollIntoView !== "function") {
    Element.prototype.scrollIntoView = function scrollIntoView() {};
  }

  if (typeof HTMLElement.prototype.hasPointerCapture !== "function") {
    HTMLElement.prototype.hasPointerCapture = function hasPointerCapture() {
      return false;
    };
  }
  if (typeof HTMLElement.prototype.releasePointerCapture !== "function") {
    HTMLElement.prototype.releasePointerCapture = function releasePointerCapture() {};
  }

  const { cleanup } = await import("@testing-library/react");
  afterEach(() => cleanup());
}
