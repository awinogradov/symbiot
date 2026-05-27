// @vitest-environment happy-dom
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const highlightToHtmlMock = vi.fn();

vi.mock("../utils/shiki.ts", () => ({
  highlightToHtml: (...args: unknown[]) => highlightToHtmlMock(...args),
}));

import { CodeBlockElement } from "./CodeBlockElement.tsx";

const element = (
  lang: string | undefined,
  text: string
): { lang?: string; children: { children: { text: string }[] }[] } => ({
  lang,
  children: [{ children: [{ text }] }],
});

describe("CodeBlockElement", () => {
  it("renders a raw <pre> fallback while shiki is loading and exposes data-lang", () => {
    highlightToHtmlMock.mockReturnValue(new Promise(() => {}));
    render(
      <CodeBlockElement attributes={{}} element={element("ts", "const a = 1")}>
        <span>slate</span>
      </CodeBlockElement>
    );
    const block = screen.getByTestId("code-block");
    expect(block.getAttribute("data-lang")).toBe("ts");
    expect(block.querySelector("pre")).not.toBeNull();
    expect(block.querySelector("pre")?.textContent).toBe("const a = 1");
  });

  it("renders the shiki-highlighted HTML once the promise resolves", async () => {
    highlightToHtmlMock.mockResolvedValue('<pre class="shiki">hi</pre>');
    render(
      <CodeBlockElement attributes={{}} element={element("ts", "code")}>
        <span>slate</span>
      </CodeBlockElement>
    );
    await waitFor(() => {
      const block = screen.getByTestId("code-block");
      expect(block.querySelector(".symbiot-shiki")).not.toBeNull();
    });
  });

  it("falls back to plain <pre> when shiki rejects (catch branch)", async () => {
    highlightToHtmlMock.mockRejectedValue(new Error("shiki down"));
    render(
      <CodeBlockElement attributes={{}} element={element(undefined, "code")}>
        <span>slate</span>
      </CodeBlockElement>
    );
    // After rejection state remains null → keeps the fallback <pre>; assert pre is still present.
    await waitFor(() => {
      const block = screen.getByTestId("code-block");
      expect(block.getAttribute("data-lang")).toBe("text");
      expect(block.querySelector("pre")).not.toBeNull();
    });
  });

  it("renders empty code when element has no children (extractCode early return)", () => {
    highlightToHtmlMock.mockReturnValue(new Promise(() => {}));
    const noChildren: { lang: string } = { lang: "md" };
    render(
      <CodeBlockElement attributes={{}} element={noChildren}>
        <span>slate</span>
      </CodeBlockElement>
    );
    const block = screen.getByTestId("code-block");
    expect(block.querySelector("pre code")?.textContent).toBe("");
  });
});
