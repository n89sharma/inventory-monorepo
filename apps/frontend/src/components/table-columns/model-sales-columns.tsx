import { createIdColumn, sortableHeader } from './column-primitives'
import { Badge } from '@/components/shadcn/badge'
import {
  formatDate,
  formatThousandsK,
  formatTitleCase,
  formatUSDWithSymbol,
} from '@/lib/formatters'
import type { ColumnDef } from '@tanstack/react-table'
import type { ModelSaleRow } from 'shared-types'

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
      header: sortableHeader<ModelSaleRow>('Date Sold'),
      cell: ({ row }) => formatDate(row.original.departed_at),
    },
    {
      accessorKey: 'purchase_price',
      header: sortableHeader<ModelSaleRow>('Purchase Price'),
      cell: ({ row }) => formatUSDWithSymbol(row.original.purchase_price),
    },
    {
      accessorKey: 'sale_price',
      header: sortableHeader<ModelSaleRow>('Sale Price'),
      cell: ({ row }) => formatUSDWithSymbol(row.original.sale_price),
    },
    {
      accessorKey: 'meter',
      header: sortableHeader<ModelSaleRow>('Meter'),
      cell: ({ row }) => formatThousandsK(row.original.meter),
    },
    {
      accessorKey: 'customer',
      header: sortableHeader<ModelSaleRow>('Customer'),
      cell: ({ row }) => formatTitleCase(row.original.customer ?? ''),
    },
    {
      accessorKey: 'salesperson',
      header: sortableHeader<ModelSaleRow>('Salesperson'),
      cell: ({ row }) => row.original.salesperson ?? '',
    },
    {
      accessorKey: 'cassettes',
      header: 'Cassettes',
      cell: ({ row }) => row.original.cassettes ?? '',
    },
    {
      accessorKey: 'internal_finisher',
      header: 'Internal Finisher',
      cell: ({ row }) => row.original.internal_finisher ?? '',
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
    },
  ]
}
