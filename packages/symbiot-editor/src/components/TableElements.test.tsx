// @vitest-environment happy-dom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  TableCellElement,
  TableCellHeaderElement,
  TableElement,
  TableRowElement,
} from "./TableElements.tsx";

describe("Table element renderers", () => {
  it("TableElement renders a rounded <table> with separate borders", () => {
    // border-collapse ignores border-radius per spec, so the rounded table
    // relies on border-separate with per-cell dividers.
    const { container } = render(<TableElement attributes={{}}>cells</TableElement>);
    const table = container.querySelector("table");
    expect(table).not.toBeNull();
    expect(table?.className).toContain("border-separate");
    expect(table?.className).toContain("rounded-md");
  });

  it("TableRowElement renders a plain <tr> (dividers live on cells)", () => {
    const { container } = render(<TableRowElement attributes={{}}>row</TableRowElement>);
    const row = container.querySelector("tr");
    expect(row).not.toBeNull();
    expect(row?.className).toBe("");
  });

  it("TableCellElement renders a <td>", () => {
    const { container } = render(<TableCellElement attributes={{}}>cell</TableCellElement>);
    expect(container.querySelector("td")).not.toBeNull();
  });

  it("TableCellHeaderElement renders a <th> with semibold left-aligned styling", () => {
    const { container } = render(
      <TableCellHeaderElement attributes={{}}>head</TableCellHeaderElement>
    );
    const th = container.querySelector("th");
    expect(th).not.toBeNull();
    expect(th?.className).toContain("font-semibold");
    expect(th?.className).toContain("text-left");
  });
});
