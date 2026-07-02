import { createIdColumn } from '@/components/table-columns/shared-columns'
import { Button } from '@/components/shadcn/button'
import { formatDate } from '@/lib/formatters'
import { ArrowsDownUpIcon } from '@phosphor-icons/react'
import type { ColumnDef } from '@tanstack/react-table'
import type { StorePartSummary } from 'shared-types'

export const storePartTableColumns: ColumnDef<StorePartSummary>[] = [
  createIdColumn<StorePartSummary>({
    accessorKey: 'part_number',
    header: 'Part #',
    href: (row) => `/store/${row.part_number}?warehouse=${row.warehouse_id}`,
    value: (row) => row.part_number,
  }),
  { accessorKey: 'description', header: 'Description' },
  { accessorKey: 'warehouse_code', header: 'Warehouse', size: 90 },
  {
    accessorKey: 'on_hand',
    size: 90,
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        On hand
        <ArrowsDownUpIcon />
      </Button>
    ),
    cell: ({ row }) => <div className="text-center tabular-nums">{row.original.on_hand}</div>,
  },
  {
    accessorKey: 'last_updated',
    size: 140,
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Last updated
        <ArrowsDownUpIcon />
      </Button>
    ),
    cell: ({ getValue }) => {
      const date = getValue<Date>()
      return date ? formatDate(date) : '-'
    },
  },
]
