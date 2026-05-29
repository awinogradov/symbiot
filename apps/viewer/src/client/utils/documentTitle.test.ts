import { describe, expect, it } from "vitest";

import { buildDocumentTitle, firstMarkdownHeading } from "./documentTitle.ts";

describe("firstMarkdownHeading", () => {
  it("extracts the first H1 heading text", () => {
    expect(firstMarkdownHeading("# Add authentication\n\nBody")).toBe("Add authentication");
  });

  it("finds an H1 that is not on the first line", () => {
    expect(firstMarkdownHeading("\n\n# Later title\nmore")).toBe("Later title");
  });

  it("returns null when there is no H1, ignoring deeper headings", () => {
    expect(firstMarkdownHeading("## Subheading\n\nplain text")).toBeNull();
  });

  it("trims surrounding whitespace from the heading text", () => {
    expect(firstMarkdownHeading("#   Spaced title   ")).toBe("Spaced title");
  });
});

describe("buildDocumentTitle", () => {
  it("appends the plan title when present", () => {
    expect(buildDocumentTitle("acme · main", "Add auth")).toBe("Symbiot · acme · main — Add auth");
  });

  it("collapses to the project context when there is no plan title", () => {
    expect(buildDocumentTitle("acme · main", null)).toBe("Symbiot · acme · main");
  });

  it("drops the project separator when displayName is empty", () => {
    expect(buildDocumentTitle("   ", null)).toBe("Symbiot");
  });
});
