import { TableComponentProps } from "@fabrix-framework/fabrix";
import { Table } from "@chakra-ui/react";
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  flexRender,
  Header,
  Cell,
} from "@tanstack/react-table";
import { SingleValueField } from "./field";

const buildTable = (props: TableComponentProps) => {
  const { headers } = props;
  const columnHelper = createColumnHelper<(typeof props)["values"][0]>();
  return {
    columns: headers.flatMap((header) => {
      const renderer = header.render;
      if (header.type === null && renderer) {
        return columnHelper.display({
          id: header.key,
          header: header.label,
          cell: (value) => renderer(value.row.original),
        });
      }

      return columnHelper.accessor(header.key, {
        header: header.label,
        cell: (value) => (
          <SingleValueField type={header.type} value={value.getValue()} />
        ),
        meta: {
          type: header.type,
        },
      });
    }),

    renderHeader: (header: Header<Record<string, unknown>, unknown>) =>
      header.isPlaceholder
        ? null
        : flexRender(header.column.columnDef.header, header.getContext()),

    renderCell: (cell: Cell<Record<string, unknown>, unknown>) =>
      flexRender(cell.column.columnDef.cell, cell.getContext()),
  };
};

export const ChakraReactTable = (props: TableComponentProps) => {
  const { className, values } = props;
  const { columns, renderHeader, renderCell } = buildTable(props);
  const table = useReactTable({
    columns,
    data: values,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Table.Root className={className} marginTop={2}>
      <Table.Header>
        {table.getHeaderGroups().map((headerGroup) => (
          <Table.Row key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <Table.ColumnHeader key={header.id} paddingStart={0}>
                {renderHeader(header)}
              </Table.ColumnHeader>
            ))}
          </Table.Row>
        ))}
      </Table.Header>
      <Table.Body>
        {table.getRowModel().rows.map((row) => (
          <Table.Row key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <Table.Cell
                key={cell.id}
                paddingStart={0}
                paddingTop={2}
                paddingBottom={2}
              >
                {renderCell(cell)}
              </Table.Cell>
            ))}
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
};
