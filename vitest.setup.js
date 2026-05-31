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
 * Most polyfills exist because a Radix component touches a browser API that
 * happy-dom does not implement; the `localStorage` stub instead bridges a
 * runtime gap (Node 25+ and Bun leave Web Storage undefined). When adding a new
 * stub here, link the upstream issue (Radix, Node, or happy-dom) that motivated
 * it via `@see`.
 *
 * @see https://github.com/capricorn86/happy-dom/issues/1796 — ResizeObserver
 * @see https://github.com/radix-ui/primitives/issues/420 — Tabs/Toggle/Popover pointer-capture in jsdom-likes
 * @see https://github.com/nodejs/node/pull/57666 — Node 25 unflags Web Storage, shadowing happy-dom's localStorage
 * @see https://github.com/nodejs/node/issues/60303 — localStorage yields undefined without --localstorage-file
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

  // Give every happy-dom spec one in-memory localStorage so behavior is identical
  // across runtimes: happy-dom supplies its own on Node <=24, but Node 25+ adds a
  // global getter that yields `undefined` (shadowing happy-dom) and Bun leaves it
  // undefined too. defineProperty (not assignment) is required to override Node
  // 25+'s getter-only accessor.
  const localStorageStore = new Map();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    writable: true,
    value: {
      get length() {
        return localStorageStore.size;
      },
      key: (index) => [...localStorageStore.keys()][index] ?? null,
      getItem: (key) => localStorageStore.get(String(key)) ?? null,
      setItem: (key, value) => {
        localStorageStore.set(String(key), String(value));
      },
      removeItem: (key) => {
        localStorageStore.delete(String(key));
      },
      clear: () => {
        localStorageStore.clear();
      },
    },
  });

  const { cleanup } = await import("@testing-library/react");
  afterEach(() => cleanup());
}
