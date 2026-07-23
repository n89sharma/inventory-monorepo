import {
  assetCountColumn,
  createdAtColumn,
  createdByColumn,
  createIdColumn,
} from '@/components/table-columns/shared-columns'
import { TransferStatusBadge } from '@/components/transfer/transfer-status-badge'
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
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <TransferStatusBadge status={row.original.status} />,
    },
    createdAtColumn as ColumnDef<TransferSummary>,
    { accessorKey: 'origin_code', header: 'Origin' },
    { accessorKey: 'destination_code', header: 'Destination' },
    {
      accessorKey: 'transporter',
      header: 'Transporter',
      cell: ({ row }) => formatTitleCase(row.original.transporter ?? ''),
    },
    createdByColumn as ColumnDef<TransferSummary>,
    assetCountColumn as ColumnDef<TransferSummary>,
  ]
}
