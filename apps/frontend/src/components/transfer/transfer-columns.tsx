import {
  assetCountColumn,
  createdAtColumn,
  createdByColumn,
  createIdColumn,
} from '@/components/table-columns/shared-columns'
import { formatTitleCase } from '@/lib/formatters'
import type { ColumnDef } from '@tanstack/react-table'
import type { TransferSummary } from 'shared-types'

export function transferTableColumns(
  getHref: (row: TransferSummary) => string,
): ColumnDef<TransferSummary>[] {
  return [
    createIdColumn<TransferSummary>({
      accessorKey: 'transfer_number',
      header: 'Transfer Number',
      href: getHref,
      value: (row) => row.transfer_number,
    }),
    createdAtColumn as ColumnDef<TransferSummary>,
    { accessorKey: 'origin_code', header: 'Origin', size: 90 },
    { accessorKey: 'destination_code', header: 'Destination', size: 90 },
    {
      accessorKey: 'transporter',
      header: 'Transporter',
      cell: ({ row }) => formatTitleCase(row.original.transporter ?? ''),
    },
    createdByColumn as ColumnDef<TransferSummary>,
    assetCountColumn as ColumnDef<TransferSummary>,
  ]
}
