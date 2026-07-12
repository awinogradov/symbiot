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

  it("renders an open todo item as a plain bullet, with no checkbox", () => {
    const { container } = render(
      <ListElement
        attributes={{ "data-slate-node": "element" }}
        element={listElement({ listStyleType: "todo" })}
      >
        open task
      </ListElement>
    );
    const list = container.firstElementChild as HTMLElement;
    expect(list.tagName).toBe("UL");
    expect(list.getAttribute("data-list-type")).toBe("todo");
    // `todo` is not a CSS list-style-type — it must resolve to a real marker,
    // or the item renders with no bullet at all.
    expect(list.style.listStyleType).toBe("disc");
    expect(list.querySelector('[data-testid="editor-task-checkbox"]')).toBeNull();
    const item = list.querySelector("li") as HTMLElement;
    expect(item.getAttribute("data-checked")).toBe("false");
    expect(item.className).not.toContain("line-through");
    expect(item.textContent).toBe("open task");
  });

  it("strikes through a done todo item", () => {
    const { container } = render(
      <ListElement attributes={{}} element={listElement({ listStyleType: "todo", checked: true })}>
        done task
      </ListElement>
    );
    const list = container.firstElementChild as HTMLElement;
    expect(list.querySelector('[data-testid="editor-task-checkbox"]')).toBeNull();
    const item = list.querySelector("li") as HTMLElement;
    expect(item.getAttribute("data-checked")).toBe("true");
    expect(item.className).toContain("line-through");
    expect(item.textContent).toBe("done task");
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
