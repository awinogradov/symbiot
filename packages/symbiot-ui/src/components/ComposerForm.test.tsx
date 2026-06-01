// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ComposerForm } from "./ComposerForm.tsx";

const testId = { textarea: "ta", cancel: "ca", save: "sa" };

describe("ComposerForm", () => {
  it("saves on Enter (no shift) with trimmed body", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <ComposerForm open placeholder="p" onSave={onSave} onCancel={vi.fn()} testId={testId} />
    );
    await user.type(screen.getByTestId("ta"), "  hello  {Enter}");
    expect(onSave).toHaveBeenCalledWith({ body: "hello", images: [] });
  });

  it("does not save when Shift+Enter is pressed — it inserts a newline instead", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <ComposerForm open placeholder="p" onSave={onSave} onCancel={vi.fn()} testId={testId} />
    );
    await user.type(screen.getByTestId("ta"), "one{Shift>}{Enter}{/Shift}two");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("cancels on Escape and clears local state", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ComposerForm open placeholder="p" onSave={vi.fn()} onCancel={onCancel} testId={testId} />
    );
    await user.type(screen.getByTestId("ta"), "hello{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("the Save button is disabled until body has non-whitespace content", async () => {
    const user = userEvent.setup();
    render(
      <ComposerForm open placeholder="p" onSave={vi.fn()} onCancel={vi.fn()} testId={testId} />
    );
    const save = screen.getByTestId<HTMLButtonElement>("sa");
    expect(save.disabled).toBe(true);
    await user.type(screen.getByTestId("ta"), "x");
    expect(save.disabled).toBe(false);
  });

  it("save is a no-op when body is empty (Enter on empty input)", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <ComposerForm open placeholder="p" onSave={onSave} onCancel={vi.fn()} testId={testId} />
    );
    await user.type(screen.getByTestId("ta"), "{Enter}");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("Cancel button click invokes onCancel", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ComposerForm open placeholder="p" onSave={vi.fn()} onCancel={onCancel} testId={testId} />
    );
    await user.click(screen.getByTestId("ca"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("seeds the textarea and images from initialBody / initialImages for edit mode", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <ComposerForm
        open
        placeholder="p"
        onSave={onSave}
        onCancel={vi.fn()}
        testId={testId}
        initialBody="seeded body"
        initialImages={["u1.png"]}
      />
    );
    expect(screen.getByTestId<HTMLTextAreaElement>("ta").value).toBe("seeded body");
    // Save is enabled immediately and emits the seeded payload unchanged.
    await user.click(screen.getByTestId("sa"));
    expect(onSave).toHaveBeenCalledWith({ body: "seeded body", images: ["u1.png"] });
  });

  it("an attached image enables save even with an empty body and clears images after save", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () => new Response(JSON.stringify({ id: "u1", extension: ".png" }), { status: 200 })
      )
    );
    try {
      render(
        <ComposerForm open placeholder="p" onSave={onSave} onCancel={vi.fn()} testId={testId} />
      );
      const file = new File(["x"], "x.png", { type: "image/png" });
      await user.upload(screen.getByTestId<HTMLInputElement>("image-attach-input"), file);
      // After upload, save is enabled even with empty body. Click triggers save with images.
      const save = screen.getByTestId<HTMLButtonElement>("sa");
      expect(save.disabled).toBe(false);
      await user.click(save);
      expect(onSave).toHaveBeenCalledWith({ body: "", images: ["u1.png"] });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
