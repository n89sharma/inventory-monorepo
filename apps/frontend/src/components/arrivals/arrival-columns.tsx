import {
  assetCountColumn,
  createdAtColumn,
  createdByColumn,
  createIdColumn,
} from '@/components/table-columns/shared-columns'
import { formatTitleCase } from '@/lib/formatters'
import type { ColumnDef } from '@tanstack/react-table'
import type { ArrivalSummary } from 'shared-types'

export function arrivalTableColumns(
  getHref: (row: ArrivalSummary) => string,
): ColumnDef<ArrivalSummary>[] {
  return [
    createIdColumn<ArrivalSummary>({
      accessorKey: 'arrival_number',
      header: 'Arrival Number',
      href: getHref,
      value: (row) => row.arrival_number,
    }),
    createdAtColumn as ColumnDef<ArrivalSummary>,
    createdByColumn as ColumnDef<ArrivalSummary>,
    { accessorKey: 'destination_code', header: 'Warehouse' },
    {
      accessorKey: 'transporter',
      header: 'Transporter',
      cell: ({ row }) => formatTitleCase(row.original.transporter ?? ''),
    },
    {
      accessorKey: 'vendor',
      header: 'Vendor',
      cell: ({ row }) => formatTitleCase(row.original.vendor ?? ''),
    },
    assetCountColumn as ColumnDef<ArrivalSummary>,
  ]
}
