// @vitest-environment happy-dom
import type { TElement } from "platejs";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ListElement } from "./ListElement.tsx";

const listElement = (extras: Record<string, unknown>): TElement => ({
  type: "p",
  children: [{ text: "" }],
  ...extras,
});

describe("ListElement", () => {
  it("renders an unordered list with editor-list testid for disc style", () => {
    const { container } = render(
      <ListElement
        attributes={{ "data-slate-node": "element" }}
        element={listElement({ listStyleType: "disc" })}
      >
        item one
      </ListElement>
    );
    const list = container.firstElementChild as HTMLElement;
    expect(list.tagName).toBe("UL");
    expect(list.getAttribute("data-testid")).toBe("editor-list");
    expect(list.getAttribute("data-list-type")).toBe("unordered");
    expect(list.querySelector("li")?.textContent).toBe("item one");
  });

  it("renders a read-only checkbox for todo items reflecting checked state", () => {
    const { container } = render(
      <ListElement
        attributes={{ "data-slate-node": "element" }}
        element={listElement({ listStyleType: "todo", checked: true })}
      >
        done task
      </ListElement>
    );
    const list = container.firstElementChild as HTMLElement;
    expect(list.tagName).toBe("UL");
    expect(list.getAttribute("data-list-type")).toBe("todo");
    const checkbox = list.querySelector<HTMLInputElement>('[data-testid="editor-task-checkbox"]');
    expect(checkbox?.checked).toBe(true);
    // Non-interactive without `disabled` — Chrome grays out disabled
    // checkboxes and ignores `accent-color`.
    expect(checkbox?.disabled).toBe(false);
    expect(checkbox?.tabIndex).toBe(-1);
    expect(checkbox?.getAttribute("aria-label")).toBe("Completed task");
    expect(list.textContent).toContain("done task");
  });

  it("renders an unchecked checkbox for open todo items", () => {
    const { container } = render(
      <ListElement attributes={{}} element={listElement({ listStyleType: "todo" })}>
        open task
      </ListElement>
    );
    const checkbox = container.querySelector<HTMLInputElement>(
      '[data-testid="editor-task-checkbox"]'
    );
    expect(checkbox?.checked).toBe(false);
  });

  it("renders an ordered list with start attribute for decimal style", () => {
    const { container } = render(
      <ListElement
        attributes={{ "data-slate-node": "element" }}
        element={listElement({ listStyleType: "decimal", listStart: 3 })}
      >
        third item
      </ListElement>
    );
    const list = container.firstElementChild as HTMLElement;
    expect(list.tagName).toBe("OL");
    expect(list.getAttribute("data-list-type")).toBe("ordered");
    expect(list.getAttribute("start")).toBe("3");
  });
});
