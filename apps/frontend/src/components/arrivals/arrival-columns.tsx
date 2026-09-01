import { createIdColumn } from '@/components/table-columns/column-primitives'
import {
  assetCountColumnDef,
  createdAtColumnDef,
  createdByColumnDef,
} from '@/components/table-columns/collection-summary-columns'
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
    createdAtColumnDef as ColumnDef<ArrivalSummary>,
    createdByColumnDef as ColumnDef<ArrivalSummary>,
    { accessorKey: 'destination_code', header: 'Warehouse' },
    {
      accessorKey: 'transporter',
      header: 'Transporter',
      cell: ({ row }) => row.original.transporter ?? '',
    },
    {
      accessorKey: 'vendor',
      header: 'Vendor',
      cell: ({ row }) => row.original.vendor ?? '',
    },
    assetCountColumnDef as ColumnDef<ArrivalSummary>,
  ]
}
