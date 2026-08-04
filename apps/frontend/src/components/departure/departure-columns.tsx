import { createIdColumn } from '@/components/table-columns/column-primitives'
import {
  assetCountColumnDef,
  createdAtColumnDef,
  createdByColumnDef,
} from '@/components/table-columns/collection-summary-columns'
import { formatTitleCase } from '@/lib/formatters'
import type { ColumnDef } from '@tanstack/react-table'
import type { DepartureSummary } from 'shared-types'

export function departureTableColumns(
  getHref: (row: DepartureSummary) => string,
): ColumnDef<DepartureSummary>[] {
  return [
    createIdColumn<DepartureSummary>({
      accessorKey: 'departure_number',
      header: 'Departure Number',
      href: getHref,
      value: (row) => row.departure_number,
    }),
    createdAtColumnDef as ColumnDef<DepartureSummary>,
    createdByColumnDef as ColumnDef<DepartureSummary>,
    { accessorKey: 'salesperson', header: 'Salesperson' },
    { accessorKey: 'origin_code', header: 'Warehouse' },
    {
      accessorKey: 'transporter',
      header: 'Transporter',
      cell: ({ row }) => formatTitleCase(row.original.transporter ?? ''),
    },
    {
      accessorKey: 'destination',
      header: 'Customer',
      cell: ({ row }) => formatTitleCase(row.original.destination ?? ''),
    },
    assetCountColumnDef as ColumnDef<DepartureSummary>,
  ]
}
