import { DestinationCell } from '@/components/store-part/destination-cell'
import { sortableHeader } from '@/components/table-columns/shared-columns'
import { formatDate, formatUSD } from '@/lib/formatters'
import type { ColumnDef } from '@tanstack/react-table'
import type { StoreTransactionRow } from 'shared-types'

export const storeTransactionLedgerColumns: ColumnDef<StoreTransactionRow>[] = [
  {
    accessorKey: 'store_transaction_number',
    header: 'Transaction #',
    cell: ({ row }) => <span className="font-mono">{row.original.store_transaction_number}</span>,
  },
  {
    accessorKey: 'created_at',
    header: sortableHeader<StoreTransactionRow>('Date'),
    cell: ({ getValue }) => formatDate(getValue<Date>()),
  },
  { accessorKey: 'type', header: 'Type' },
  {
    accessorKey: 'quantity',
    header: 'Qty',
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
    cell: ({ row }) => (row.original.unit_cost === null ? '—' : formatUSD(row.original.unit_cost)),
  },
  {
    id: 'destination',
    header: 'Destination',
    cell: ({ row }) => <DestinationCell row={row.original} />,
  },
  { accessorKey: 'created_by', header: 'By' },
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
