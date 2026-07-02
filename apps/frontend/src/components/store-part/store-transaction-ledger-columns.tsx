import { Button } from '@/components/shadcn/button'
import { DestinationCell } from '@/components/store-part/destination-cell'
import { formatDate, formatUSD } from '@/lib/formatters'
import { ArrowsDownUpIcon } from '@phosphor-icons/react'
import type { ColumnDef } from '@tanstack/react-table'
import type { StoreTransactionRow } from 'shared-types'

export const storeTransactionLedgerColumns: ColumnDef<StoreTransactionRow>[] = [
  {
    accessorKey: 'store_transaction_number',
    header: 'Transaction #',
    size: 120,
    cell: ({ row }) => <span className="font-mono">{row.original.store_transaction_number}</span>,
  },
  {
    accessorKey: 'created_at',
    size: 140,
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Date
        <ArrowsDownUpIcon />
      </Button>
    ),
    cell: ({ getValue }) => formatDate(getValue<Date>()),
  },
  { accessorKey: 'type', header: 'Type', size: 100 },
  {
    accessorKey: 'quantity',
    header: 'Qty',
    size: 80,
    cell: ({ row }) => {
      const { quantity, is_inbound } = row.original
      return (
        <span className={`tabular-nums ${is_inbound ? 'text-emerald-600' : 'text-destructive'}`}>
          {is_inbound ? '+' : '−'}
          {quantity}
        </span>
      )
    },
  },
  {
    accessorKey: 'unit_cost',
    header: 'Unit cost',
    size: 100,
    cell: ({ row }) => (row.original.unit_cost === null ? '—' : formatUSD(row.original.unit_cost)),
  },
  {
    id: 'destination',
    header: 'Destination',
    size: 160,
    cell: ({ row }) => <DestinationCell row={row.original} />,
  },
  { accessorKey: 'created_by', header: 'By', size: 120 },
  {
    accessorKey: 'notes',
    header: 'Notes',
    cell: ({ row }) => (
      <span className="block max-w-50 truncate" title={row.original.notes ?? ''}>
        {row.original.notes ?? '—'}
      </span>
    ),
  },
]
