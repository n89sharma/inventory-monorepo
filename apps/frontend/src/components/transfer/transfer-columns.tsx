import { createIdColumn } from '@/components/table-columns/column-primitives'
import {
  assetCountColumnDef,
  createdByColumnDef,
} from '@/components/table-columns/collection-summary-columns'
import { TransferStatusBadge } from '@/components/transfer/transfer-status-badge'
import { formatDate } from '@/lib/formatters'
import type { ColumnDef } from '@tanstack/react-table'
import { parseISO } from 'date-fns'
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
    {
      id: 'transfer_date',
      header: 'Date',
      cell: ({ row }) => {
        const { transfer_date, created_at } = row.original
        if (transfer_date !== null) return formatDate(parseISO(transfer_date))
        return created_at ? formatDate(created_at) : '-'
      },
    },
    { accessorKey: 'origin_code', header: 'Origin' },
    { accessorKey: 'destination_code', header: 'Destination' },
    {
      accessorKey: 'transporter',
      header: 'Transporter',
      cell: ({ row }) => row.original.transporter ?? '',
    },
    createdByColumnDef as ColumnDef<TransferSummary>,
    assetCountColumnDef as ColumnDef<TransferSummary>,
  ]
}
