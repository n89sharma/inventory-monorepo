import { Button } from '@/components/shadcn/button'
import { formatDate, formatUSD } from '@/lib/formatters'
import { ArrowsDownUpIcon } from '@phosphor-icons/react'
import type { ColumnDef } from '@tanstack/react-table'
import type { StorePartSummary, StoreTransactionRow } from 'shared-types'
import { Link } from 'react-router-dom'
import { createIdColumn } from './shared-columns'

export const storePartTableColumns: ColumnDef<StorePartSummary>[] = [
  createIdColumn<StorePartSummary>({
    accessorKey: 'part_number',
    header: 'Part #',
    href: (row) => `/store/${row.part_number}?warehouse=${row.warehouse_id}`,
    value: (row) => row.part_number,
  }),
  { accessorKey: 'description', header: 'Description' },
  { accessorKey: 'warehouse_code', header: 'Warehouse', size: 90 },
  {
    accessorKey: 'on_hand',
    size: 90,
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        On hand
        <ArrowsDownUpIcon />
      </Button>
    ),
    cell: ({ row }) => <div className="text-center tabular-nums">{row.original.on_hand}</div>,
  },
  {
    accessorKey: 'last_updated',
    size: 140,
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Last updated
        <ArrowsDownUpIcon />
      </Button>
    ),
    cell: ({ getValue }) => {
      const date = getValue<Date>()
      return date ? formatDate(date) : '-'
    },
  },
]

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

function DestinationCell({ row }: { row: StoreTransactionRow }) {
  if (row.departure_number) {
    return (
      <Link
        to={`/departures/${row.departure_number}`}
        className="font-mono text-foreground hover:underline"
      >
        {row.departure_number}
      </Link>
    )
  }
  if (row.asset_barcode) {
    return (
      <Link
        to={`/search/all/${row.asset_barcode}`}
        className="font-mono text-foreground hover:underline"
      >
        Asset · {row.asset_barcode}
      </Link>
    )
  }
  return <span>—</span>
}
