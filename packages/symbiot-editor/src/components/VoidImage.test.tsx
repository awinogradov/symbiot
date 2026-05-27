// @vitest-environment happy-dom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { VoidImage } from "./VoidImage.tsx";

describe("VoidImage", () => {
  it("renders an <img> when element.url is defined and falls back to empty alt when alt is undefined", () => {
    const { container } = render(
      <VoidImage attributes={{}} element={{ url: "https://example.com/a.png" }}>
        {null}
      </VoidImage>
    );
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("https://example.com/a.png");
    expect(img?.getAttribute("alt")).toBe("");
  });

  it("uses provided alt text when present", () => {
    const { container } = render(
      <VoidImage attributes={{}} element={{ url: "/u/1", alt: "logo" }}>
        {null}
      </VoidImage>
    );
    expect(container.querySelector("img")?.getAttribute("alt")).toBe("logo");
  });

  it("omits the <img> entirely when element.url is undefined", () => {
    const { container } = render(
      <VoidImage attributes={{}} element={{}}>
        {null}
      </VoidImage>
    );
    expect(container.querySelector("img")).toBeNull();
  });
});
