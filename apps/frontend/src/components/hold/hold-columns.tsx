import { createIdColumn } from '@/components/table-columns/column-primitives'
import {
  assetCountColumnDef,
  createdAtColumnDef,
  createdByColumnDef,
} from '@/components/table-columns/collection-summary-columns'
import { formatTitleCase } from '@/lib/formatters'
import type { ColumnDef } from '@tanstack/react-table'
import type { HoldSummary } from 'shared-types'

export function holdTableColumns(getHref: (row: HoldSummary) => string): ColumnDef<HoldSummary>[] {
  return [
    createIdColumn<HoldSummary>({
      accessorKey: 'hold_number',
      header: 'Hold Number',
      href: getHref,
      value: (row) => row.hold_number,
    }),
    createdByColumnDef as ColumnDef<HoldSummary>,
    { accessorKey: 'created_for', header: 'Created For' },
    {
      accessorKey: 'customer',
      header: 'Customer',
      cell: ({ row }) => formatTitleCase(row.original.customer ?? ''),
    },
    createdAtColumnDef as ColumnDef<HoldSummary>,
    assetCountColumnDef as ColumnDef<HoldSummary>,
  ]
}
