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
  it("TableElement renders a <table> with collapse classes", () => {
    const { container } = render(<TableElement attributes={{}}>cells</TableElement>);
    const table = container.querySelector("table");
    expect(table).not.toBeNull();
    expect(table?.className).toContain("border-collapse");
  });

  it("TableRowElement renders a <tr> with bottom border", () => {
    const { container } = render(<TableRowElement attributes={{}}>row</TableRowElement>);
    expect(container.querySelector("tr")).not.toBeNull();
    expect(container.querySelector("tr")?.className).toContain("border-b");
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
