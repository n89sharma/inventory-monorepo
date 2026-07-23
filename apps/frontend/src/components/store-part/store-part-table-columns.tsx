import { createIdColumn, sortableHeader } from '@/components/table-columns/column-primitives'
import { formatDate } from '@/lib/formatters'
import type { ColumnDef } from '@tanstack/react-table'
import type { StorePartSummary } from 'shared-types'

export const storePartTableColumns: ColumnDef<StorePartSummary>[] = [
  createIdColumn<StorePartSummary>({
    accessorKey: 'part_number',
    header: 'Part #',
    href: (row) => `/store/${row.id}?warehouse=${row.warehouse_id}`,
    value: (row) => row.part_number,
  }),
  { accessorKey: 'description', header: 'Description' },
  { accessorKey: 'warehouse_code', header: 'Warehouse' },
  {
    accessorKey: 'on_hand',
    header: sortableHeader<StorePartSummary>('On hand'),
    cell: ({ row }) => <div className="text-center tabular-nums">{row.original.on_hand}</div>,
  },
  {
    accessorKey: 'last_updated',
    header: sortableHeader<StorePartSummary>('Last updated'),
    cell: ({ getValue }) => {
      const date = getValue<Date>()
      return date ? formatDate(date) : '-'
    },
  },
]
