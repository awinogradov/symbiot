// @vitest-environment happy-dom
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useDocumentTitle } from "./useDocumentTitle.ts";

afterEach(() => {
  document.title = "";
});

describe("useDocumentTitle", () => {
  it("writes the composed title on mount and re-syncs when the plan changes", () => {
    const { rerender } = renderHook(({ name, md }) => useDocumentTitle(name, md), {
      initialProps: { name: "acme · main", md: "# Add auth\n\nBody" },
    });
    expect(document.title).toBe("Symbiot · acme · main — Add auth");

    rerender({ name: "acme · main", md: "no heading here" });
    expect(document.title).toBe("Symbiot · acme · main");
  });
});
