import {
  assetCountColumn,
  createdAtColumn,
  createdByColumn,
  createIdColumn,
} from '@/components/pages/column-defs/shared-columns'
import { formatTitleCase } from '@/lib/formatters'
import type { ColumnDef } from '@tanstack/react-table'
import type { HoldSummary } from 'shared-types'

export const holdTableColumns: ColumnDef<HoldSummary>[] = [
  createIdColumn<HoldSummary>({
    accessorKey: 'hold_number',
    header: 'Hold Number',
    href: (row) => `/holds/${row.hold_number}`,
    value: (row) => row.hold_number,
  }),
  createdByColumn as ColumnDef<HoldSummary>,
  { accessorKey: 'created_for', header: 'Created For' },
  {
    accessorKey: 'customer',
    header: 'Customer',
    cell: ({ row }) => formatTitleCase(row.original.customer ?? ''),
  },
  createdAtColumn as ColumnDef<HoldSummary>,
  assetCountColumn as ColumnDef<HoldSummary>,
]
