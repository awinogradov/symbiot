import type { ReactNode } from "react";

interface TableElementProps {
  attributes: Record<string, unknown>;
  children: ReactNode;
}

/**
 * Plate element renderers for `table` / `tr` / `td` / `th`. Without explicit
 * components, Plate falls back to a generic `<div>` and `remark-gfm`'s table
 * mdast nodes render as flattened text in the editor. Semantic table tags
 * restore the `<table><tr><td>` DOM shape so the `prose` typography plugin
 * styles them correctly.
 */
export const TableElement = ({ attributes, children }: TableElementProps): React.ReactElement => (
  <table
    {...attributes}
    data-testid="editor-table"
    className="border-border my-4 w-full border-collapse border text-sm"
  >
    {children}
  </table>
);

export const TableRowElement = ({
  attributes,
  children,
}: TableElementProps): React.ReactElement => (
  <tr {...attributes} className="border-border border-b">
    {children}
  </tr>
);

export const TableCellElement = ({
  attributes,
  children,
}: TableElementProps): React.ReactElement => (
  <td {...attributes} className="border-border border px-3 py-2 align-top">
    {children}
  </td>
);

export const TableCellHeaderElement = ({
  attributes,
  children,
}: TableElementProps): React.ReactElement => (
  <th {...attributes} className="border-border bg-muted border px-3 py-2 text-left font-semibold">
    {children}
  </th>
);
