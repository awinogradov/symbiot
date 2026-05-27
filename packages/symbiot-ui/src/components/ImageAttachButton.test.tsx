// @vitest-environment happy-dom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildImageUrl, ImageAttachButton } from "./ImageAttachButton.tsx";

describe("buildImageUrl", () => {
  it("encodes id and extension in the query string when a dot is present", () => {
    expect(buildImageUrl("abc.png")).toBe("/api/image?id=abc&ext=.png");
  });

  it("returns an empty ext when no dot is present", () => {
    expect(buildImageUrl("nodot")).toBe("/api/image?id=nodot&ext=");
  });

  it("encodes special characters in id and ext", () => {
    expect(buildImageUrl("a b.j p g")).toBe("/api/image?id=a%20b&ext=.j%20p%20g");
  });
});

describe("ImageAttachButton", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ id: "uuid-1", extension: ".png" }), { status: 200 })
      )
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the trigger button with the attach aria-label", () => {
    render(<ImageAttachButton onAttach={vi.fn()} />);
    expect(screen.getByTestId("image-attach-button").getAttribute("aria-label")).toBe(
      "Attach image"
    );
  });

  it("uploads the picked file and calls onAttach with the encoded ref", async () => {
    const user = userEvent.setup();
    const onAttach = vi.fn();
    render(<ImageAttachButton onAttach={onAttach} />);
    const input = screen.getByTestId<HTMLInputElement>("image-attach-input");
    const file = new File(["x"], "x.png", { type: "image/png" });
    await user.upload(input, file);
    await waitFor(() => {
      expect(onAttach).toHaveBeenCalledWith("uuid-1.png");
    });
  });

  it("logs an error when /api/upload returns non-OK and does not call onAttach", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 500 }))
    );
    const user = userEvent.setup();
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const onAttach = vi.fn();
    render(<ImageAttachButton onAttach={onAttach} />);
    const file = new File(["x"], "x.png", { type: "image/png" });
    await user.upload(screen.getByTestId<HTMLInputElement>("image-attach-input"), file);
    await waitFor(() => {
      expect(errSpy).toHaveBeenCalled();
    });
    expect(onAttach).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("is disabled when the disabled prop is true", () => {
    render(<ImageAttachButton onAttach={vi.fn()} disabled />);
    expect(screen.getByTestId<HTMLButtonElement>("image-attach-button").disabled).toBe(true);
  });
});
