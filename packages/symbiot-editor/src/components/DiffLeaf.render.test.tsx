// @vitest-environment happy-dom
import type { DiffOperation } from "@platejs/diff";
import { render } from "@testing-library/react";
import { createElement, type ElementType, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

// PlateLeaf is mocked to a passthrough that surfaces the props we care about
// (as, className, attributes) on a deterministic DOM node so we can assert
// DiffLeaf's prop construction without standing up a Plate editor context.
vi.mock("platejs/react", () => ({
  PlateLeaf: ({
    as,
    className,
    attributes,
    children,
  }: {
    as?: string;
    className?: string;
    attributes?: Record<string, unknown>;
    children: ReactNode;
  }) =>
    createElement(
      (as ?? "span") as ElementType,
      { "data-testid": "plate-leaf-mock", className, ...attributes },
      children
    ),
}));

import { DiffLeaf, diffElementWrapper } from "./DiffLeaf.tsx";

type DiffLeafProps = Parameters<typeof DiffLeaf>[0];

const leafProps = (op: DiffOperation | undefined): DiffLeafProps => {
  const leaf = op === undefined ? { text: "x" } : { text: "x", diffOperation: op };
  return {
    leaf,
    children: "leaf-text",
    attributes: {},
    text: { text: "x" },
    editor: {},
    nodeProps: {},
    element: { type: "p", children: [{ text: "x" }] },
  } as unknown as DiffLeafProps;
};

describe("DiffLeaf component", () => {
  it("forwards children through PlateLeaf unchanged when no diffOperation is on the leaf", () => {
    const { container } = render(<DiffLeaf {...leafProps(undefined)} />);
    const node = container.querySelector('[data-testid="plate-leaf-mock"]');
    if (node === null) throw new Error("PlateLeaf mock did not render");
    expect(node.getAttribute("data-diff-op")).toBeNull();
    expect(node.textContent).toBe("leaf-text");
  });

  // Use schema-valid op shapes per `@platejs/diff` — `update` requires
  // `properties` + `newProperties`; `insert` / `delete` do not.
  const ops: { op: DiffOperation; tag: string; classToken: string }[] = [
    {
      op: { type: "insert", path: [0] } as unknown as DiffOperation,
      tag: "INS",
      classToken: "text-anno-insert",
    },
    {
      op: { type: "delete", path: [0] } as unknown as DiffOperation,
      tag: "DEL",
      classToken: "text-anno-delete",
    },
    {
      op: {
        type: "update",
        path: [0],
        properties: {},
        newProperties: {},
      } as unknown as DiffOperation,
      tag: "SPAN",
      classToken: "text-anno-replace",
    },
  ];

  it.each(ops)(
    "$op.type op renders as <$tag> with the matching palette class and data-diff-op attribute",
    ({ op, tag, classToken }) => {
      const { container } = render(<DiffLeaf {...leafProps(op)} />);
      const node = container.querySelector('[data-testid="plate-leaf-mock"]');
      if (node === null) throw new Error("PlateLeaf mock did not render");
      expect(node.tagName).toBe(tag);
      expect(node.className).toContain(classToken);
      expect(node.getAttribute("data-diff-op")).toBe(op.type);
    }
  );

  it("update op with property changes adds the descriptive title attribute", () => {
    const op = {
      type: "update",
      path: [0],
      properties: { bold: true },
      newProperties: { bold: false, italic: true },
    } as unknown as DiffOperation;
    const { container } = render(<DiffLeaf {...leafProps(op)} />);
    const node = container.querySelector('[data-testid="plate-leaf-mock"]');
    if (node === null) throw new Error("PlateLeaf mock did not render");
    const title = node.getAttribute("title");
    expect(title).toContain("bold");
    expect(title).toContain("italic");
  });

  it("update op with no changed properties omits the title attribute", () => {
    const op = {
      type: "update",
      path: [0],
      properties: {},
      newProperties: {},
    } as unknown as DiffOperation;
    const { container } = render(<DiffLeaf {...leafProps(op)} />);
    const node = container.querySelector('[data-testid="plate-leaf-mock"]');
    if (node === null) throw new Error("PlateLeaf mock did not render");
    expect(node.hasAttribute("title")).toBe(false);
  });
});

describe("diffElementWrapper", () => {
  type WrapperProps = Parameters<ReturnType<typeof diffElementWrapper>>[0];

  const stubEditor = (isInline: boolean): WrapperProps["editor"] =>
    ({ api: { isInline: () => isInline } }) as unknown as WrapperProps["editor"];

  const stubElement = (
    overrides: Partial<{ diff: boolean; diffOperation: DiffOperation }> = {}
  ): WrapperProps["element"] =>
    Object.assign(Object.create(null), { type: "p", children: [], ...overrides });

  it("returns children unchanged when the element has no diff flag", () => {
    const Wrapper = diffElementWrapper();
    const editor = stubEditor(false);
    const props: WrapperProps = {
      children: <span data-testid="raw">x</span>,
      element: stubElement(),
      editor,
    } as unknown as WrapperProps;
    const { container } = render(<>{Wrapper(props)}</>);
    expect(container.querySelector("[data-testid=raw]")?.textContent).toBe("x");
    expect(container.querySelector("[data-diff-block]")).toBeNull();
  });

  it("wraps a block diff element in a <div> tagged with the op type and palette class", () => {
    const Wrapper = diffElementWrapper();
    const op = { type: "insert", path: [0] } as unknown as DiffOperation;
    const props: WrapperProps = {
      children: <span>x</span>,
      element: stubElement({ diff: true, diffOperation: op }),
      editor: stubEditor(false),
    } as unknown as WrapperProps;
    const { container } = render(<>{Wrapper(props)}</>);
    const wrapper = container.querySelector("[data-diff-block=insert]");
    if (wrapper === null) throw new Error("diff-block wrapper missing");
    expect(wrapper.tagName).toBe("DIV");
    expect(wrapper.className).toContain("text-anno-insert");
  });

  it("uses a <span> wrapper for inline diff elements", () => {
    const Wrapper = diffElementWrapper();
    const op = { type: "delete", path: [0] } as unknown as DiffOperation;
    const props: WrapperProps = {
      children: <em>x</em>,
      element: stubElement({ diff: true, diffOperation: op }),
      editor: stubEditor(true),
    } as unknown as WrapperProps;
    const { container } = render(<>{Wrapper(props)}</>);
    const wrapper = container.querySelector("[data-diff-block=delete]");
    if (wrapper === null) throw new Error("diff-block wrapper missing");
    expect(wrapper.tagName).toBe("SPAN");
  });
});
