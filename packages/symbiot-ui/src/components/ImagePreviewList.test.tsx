// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ImagePreviewList } from "./ImagePreviewList.tsx";

describe("ImagePreviewList", () => {
  it("returns nothing when images is empty (no DOM)", () => {
    const { container } = render(<ImagePreviewList images={[]} onRemove={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders one thumbnail per ref in insertion order with src=buildImageUrl(ref)", () => {
    render(<ImagePreviewList images={["a.png", "b.jpg"]} onRemove={vi.fn()} />);
    const thumbs = screen.getAllByRole("img");
    expect(thumbs).toHaveLength(2);
    expect(thumbs[0]?.getAttribute("src")).toContain("id=a");
    expect(thumbs[1]?.getAttribute("src")).toContain("id=b");
  });

  it("clicking the remove button invokes onRemove with that thumbnail's ref", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<ImagePreviewList images={["a.png"]} onRemove={onRemove} />);
    await user.click(screen.getByTestId("image-preview-remove-a.png"));
    expect(onRemove).toHaveBeenCalledWith("a.png");
  });
});
