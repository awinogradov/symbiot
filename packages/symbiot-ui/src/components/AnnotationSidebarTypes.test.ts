import { describe, expect, it } from "vitest";

import {
  kindClass,
  kindLabel,
  removalDescription,
  type AnnotationSidebarEntry,
} from "./AnnotationSidebarTypes.tsx";

type Kind = AnnotationSidebarEntry["kind"];

// Source-of-truth tables that mirror the production helpers. Literal expected
// values (no re-implementation) so any drift in the production helpers fails
// the test loudly.
const expectedLabel: Record<Kind, string> = {
  comment: "Comment",
  deletion: "Deletion",
  global: "Global",
  insertion: "Insertion",
  replacement: "Replacement",
};

const expectedPaletteToken: Record<Kind, string> = {
  comment: "text-anno-comment",
  global: "text-anno-comment",
  deletion: "text-anno-delete",
  insertion: "text-anno-insert",
  replacement: "text-anno-replace",
};

const expectedRemovalNoun: Record<Kind, string> = {
  comment: "comment",
  deletion: "deletion suggestion",
  global: "global comment",
  insertion: "insertion suggestion",
  replacement: "replacement suggestion",
};

const kinds = Object.keys(expectedLabel) as Kind[];

describe("AnnotationSidebarTypes helpers", () => {
  it.each(kinds)("kindLabel(%s) returns its literal human-readable label", (kind) => {
    expect(kindLabel(kind)).toBe(expectedLabel[kind]);
  });

  it.each(kinds)("kindClass(%s) returns its anno palette token", (kind) => {
    expect(kindClass(kind)).toBe(expectedPaletteToken[kind]);
  });

  it.each(kinds)(
    "removalDescription(%s) names the kind and includes the irreversibility warning",
    (kind) => {
      const description = removalDescription(kind);
      expect(description).toContain(expectedRemovalNoun[kind]);
      expect(description).toContain("can't be undone");
    }
  );
});
