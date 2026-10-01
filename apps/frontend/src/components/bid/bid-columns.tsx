import { BidOutcomeBadge, BidStatusBadge } from '@/components/bid/bid-status-badge'
import { createIdColumn } from '@/components/table-columns/column-primitives'
import { formatDateOnly, formatUSDWithSymbol } from '@/lib/formatters'
import type { ColumnDef } from '@tanstack/react-table'
import type { BidSummary } from 'shared-types'

export const BID_TEXT_SEARCH_COLUMN_IDS = ['vendor', 'notes']

export function bidTableColumns(getHref: (row: BidSummary) => string): ColumnDef<BidSummary>[] {
  return [
    createIdColumn<BidSummary>({
      accessorKey: 'bid_number',
      header: 'Bid #',
      href: getHref,
      value: (row) => row.bid_number,
    }),
    { id: 'vendor', header: 'Vendor', accessorFn: (row) => row.vendor.name },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <BidStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'received_date',
      header: 'Received',
      cell: ({ row }) => formatDateOnly(row.original.received_date),
    },
    {
      accessorKey: 'due_date',
      header: 'Due',
      cell: ({ row }) => formatDateOnly(row.original.due_date),
    },
    {
      accessorKey: 'submitted_date',
      header: 'Submitted',
      sortUndefined: 'last',
      cell: ({ row }) => formatDateOnly(row.original.submitted_date),
    },
    { accessorKey: 'row_count', header: 'Assets' },
    {
      accessorKey: 'total_cost',
      header: 'Bid Amount',
      cell: ({ row }) => formatUSDWithSymbol(row.original.total_cost),
    },
    {
      id: 'outcome',
      header: 'Won/Lost',
      accessorFn: (row) => row.outcome ?? '',
      cell: ({ row }) =>
        row.original.outcome ? <BidOutcomeBadge outcome={row.original.outcome} /> : null,
    },
    { id: 'notes', header: 'Notes', accessorFn: (row) => row.notes ?? '' },
  ]
}
