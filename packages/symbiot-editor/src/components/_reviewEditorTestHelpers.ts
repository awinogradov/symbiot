/**
 * @module reviewEditorTestHelpers
 *
 * Shared mock factories for `ReviewEditor*` tests. Co-located with the
 * component sources so test files import them as siblings; excluded from
 * coverage via the `**` test exclusion glob in `vitest.config.ts`.
 */
import { vi } from "vitest";

import type { ToolbarHandlerDeps } from "./ReviewEditorAuthoring.tsx";
import type { AnnotationMaps, PruneSetters } from "./ReviewEditorState.tsx";

export const emptyMaps = (): AnnotationMaps => ({
  bodies: new Map(),
  images: new Map(),
  commentOriginalTexts: new Map(),
  suggestionOriginalTexts: new Map(),
  insertionNewTexts: new Map(),
  insertionImages: new Map(),
  insertionOriginalTexts: new Map(),
  replacementTexts: new Map(),
  replacementImages: new Map(),
  replacementOriginalTexts: new Map(),
});

export const stubSetters = (): PruneSetters => ({
  setBodies: vi.fn(),
  setImages: vi.fn(),
  setCommentOriginalTexts: vi.fn(),
  setSuggestionOriginalTexts: vi.fn(),
  setInsertionNewTexts: vi.fn(),
  setInsertionImages: vi.fn(),
  setInsertionOriginalTexts: vi.fn(),
  setReplacementTexts: vi.fn(),
  setReplacementImages: vi.fn(),
  setReplacementOriginalTexts: vi.fn(),
});

type EditorMock = ToolbarHandlerDeps["editor"];

export const stubEditor = (overrides: Partial<EditorMock> = {}): EditorMock =>
  Object.assign(Object.create(null), { children: [], ...overrides });
