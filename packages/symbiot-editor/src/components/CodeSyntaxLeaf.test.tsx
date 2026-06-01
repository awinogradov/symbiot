// @vitest-environment happy-dom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CodeSyntaxLeaf } from "./CodeSyntaxLeaf.tsx";

describe("CodeSyntaxLeaf", () => {
  it("paints the light colour and stashes the dark colour as --shiki-dark", () => {
    const { container } = render(
      <CodeSyntaxLeaf
        attributes={{ "data-slate-leaf": true }}
        leaf={{ codeLight: "#cf222e", codeDark: "#ff7b72" }}
      >
        const
      </CodeSyntaxLeaf>
    );
    const span = container.querySelector("span");
    expect(span?.style.color).toBe("#cf222e");
    expect(span?.style.getPropertyValue("--shiki-dark")).toBe("#ff7b72");
    expect(span?.textContent).toBe("const");
  });

  it("omits colour declarations when the token carries none (whitespace)", () => {
    const { container } = render(
      <CodeSyntaxLeaf attributes={{}} leaf={{ codeLight: null, codeDark: null }}>
        {"  "}
      </CodeSyntaxLeaf>
    );
    const span = container.querySelector("span");
    expect(span?.style.color).toBe("");
    expect(span?.style.getPropertyValue("--shiki-dark")).toBe("");
  });
});
