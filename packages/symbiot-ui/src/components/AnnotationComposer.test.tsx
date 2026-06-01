// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AnnotationComposer } from "./AnnotationComposer.tsx";

interface AnchoredKindCase {
  kind: "comment" | "insertion" | "replacement";
  paletteToken: string;
}

const anchoredKinds: AnchoredKindCase[] = [
  { kind: "comment", paletteToken: "border-anno-comment" },
  { kind: "insertion", paletteToken: "border-anno-insert" },
  { kind: "replacement", paletteToken: "border-anno-replace" },
];

describe("AnnotationComposer", () => {
  it.each(anchoredKinds)(
    "$kind kind renders the quote block with the matching palette token and the anchored testid",
    ({ kind, paletteToken }) => {
      render(
        <AnnotationComposer
          kind={kind}
          open
          quote={`anchor-${kind}`}
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
      );
      expect(screen.getByTestId("annotation-composer").getAttribute("data-kind")).toBe(kind);
      const quote = screen.getByTestId("composer-quote");
      expect(quote.textContent).toBe(`anchor-${kind}`);
      expect(quote.className).toContain(paletteToken);
    }
  );

  it("global kind omits the quote block and uses the global testid", () => {
    render(<AnnotationComposer kind="global" open onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByTestId("global-comment-composer").getAttribute("data-kind")).toBe("global");
    expect(screen.queryByTestId("composer-quote")).toBeNull();
  });

  it("invokes onCancel when the dialog requests close via the ComposerForm", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <AnnotationComposer kind="comment" open quote="x" onSave={vi.fn()} onCancel={onCancel} />
    );
    await user.click(screen.getByTestId("composer-cancel"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("dispatches the trimmed body to onSave when the form saves", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<AnnotationComposer kind="comment" open quote="x" onSave={onSave} onCancel={vi.fn()} />);
    await user.type(screen.getByTestId("composer-textarea"), "hi{Enter}");
    expect(onSave).toHaveBeenCalledWith({ body: "hi", images: [] });
  });

  it("create mode marks the dialog with data-mode=create and shows the create title", () => {
    render(<AnnotationComposer kind="global" open onSave={vi.fn()} onCancel={vi.fn()} />);
    const composer = screen.getByTestId("global-comment-composer");
    expect(composer.getAttribute("data-mode")).toBe("create");
    expect(screen.getByText("Global comment")).not.toBeNull();
  });

  it("edit mode marks data-mode=edit, shows the edit title, and prefills the body", () => {
    render(
      <AnnotationComposer
        kind="comment"
        open
        mode="edit"
        quote="anchor"
        initialBody="prefilled"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    const composer = screen.getByTestId("annotation-composer");
    expect(composer.getAttribute("data-mode")).toBe("edit");
    expect(screen.getByText("Edit comment")).not.toBeNull();
    expect(screen.getByTestId<HTMLTextAreaElement>("composer-textarea").value).toBe("prefilled");
  });

  it("Escape on the textarea triggers the Dialog's onOpenChange→onCancel path", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <AnnotationComposer kind="comment" open quote="x" onSave={vi.fn()} onCancel={onCancel} />
    );
    await user.type(screen.getByTestId("composer-textarea"), "{Escape}");
    expect(onCancel).toHaveBeenCalled();
  });
});
