import { formatTitleCase } from '@/lib/formatters'
import type { ColumnDef } from '@tanstack/react-table'
import type { TransferSummary } from 'shared-types'
import {
  assetCountColumn,
  createdAtColumn,
  createdByColumn,
  createIdColumn,
} from './shared-columns'

export const transferTableColumns: ColumnDef<TransferSummary>[] = [
  createIdColumn<TransferSummary>({
    accessorKey: 'transfer_number',
    header: 'Transfer Number',
    href: (row) => `/transfers/${row.transfer_number}`,
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
