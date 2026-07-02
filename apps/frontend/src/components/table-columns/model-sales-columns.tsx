import { createIdColumn } from './shared-columns'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import {
  formatDate,
  formatThousandsK,
  formatTitleCase,
  formatUSDWithSymbol,
} from '@/lib/formatters'
import { ArrowsDownUpIcon } from '@phosphor-icons/react'
import type { ColumnDef } from '@tanstack/react-table'
import type { ModelSaleRow } from 'shared-types'

function SortableHeader({ label, onToggle }: { label: string; onToggle: () => void }) {
  return (
    <Button variant="ghost" onClick={onToggle} className="h-auto whitespace-normal py-1">
      {label}
      <ArrowsDownUpIcon />
    </Button>
  )
}

export function createModelSalesColumns(
  detailHref: (row: ModelSaleRow) => string,
): ColumnDef<ModelSaleRow>[] {
  return [
    createIdColumn<ModelSaleRow>({
      accessorKey: 'barcode',
      header: 'Barcode',
      href: detailHref,
      value: (row) => row.barcode,
    }),
    {
      accessorKey: 'departed_at',
      header: ({ column }) => (
        <SortableHeader
          label="Date Sold"
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => formatDate(row.original.departed_at),
      size: 140,
    },
    {
      accessorKey: 'purchase_price',
      header: ({ column }) => (
        <SortableHeader
          label="Purchase Price"
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => formatUSDWithSymbol(row.original.purchase_price),
      size: 110,
    },
    {
      accessorKey: 'sale_price',
      header: ({ column }) => (
        <SortableHeader
          label="Sale Price"
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => formatUSDWithSymbol(row.original.sale_price),
      size: 100,
    },
    {
      accessorKey: 'meter',
      header: ({ column }) => (
        <SortableHeader
          label="Meter"
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => formatThousandsK(row.original.meter),
      size: 80,
    },
    {
      accessorKey: 'customer',
      header: ({ column }) => (
        <SortableHeader
          label="Customer"
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => formatTitleCase(row.original.customer ?? ''),
      size: 160,
    },
    {
      accessorKey: 'salesperson',
      header: ({ column }) => (
        <SortableHeader
          label="Salesperson"
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => row.original.salesperson ?? '',
      size: 120,
    },
    {
      accessorKey: 'cassettes',
      header: 'Cassettes',
      cell: ({ row }) => row.original.cassettes ?? '',
      size: 80,
    },
    {
      accessorKey: 'internal_finisher',
      header: 'Internal Finisher',
      cell: ({ row }) => row.original.internal_finisher ?? '',
      size: 120,
    },
    {
      accessorKey: 'core_functions',
      header: 'Core Functions',
      cell: ({ row }) => (
        <div className="flex flex-wrap justify-center gap-1">
          {row.original.core_functions.map((name) => (
            <Badge key={name} variant="outline">
              {name}
            </Badge>
          ))}
        </div>
      ),
      size: 160,
    },
  ]
}
