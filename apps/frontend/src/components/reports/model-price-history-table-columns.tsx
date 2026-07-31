import { createIdColumn, sortableHeader } from '@/components/table-columns/column-primitives'
import { Badge } from '@/components/shadcn/badge'
import {
  formatDate,
  formatThousandsK,
  formatTitleCase,
  formatUSDWithSymbol,
} from '@/lib/formatters'
import type { ColumnDef } from '@tanstack/react-table'
import type { ModelPriceHistoryRow } from 'shared-types'

export function createModelPriceHistoryColumns(
  detailHref: (row: ModelPriceHistoryRow) => string,
): ColumnDef<ModelPriceHistoryRow>[] {
  return [
    createIdColumn<ModelPriceHistoryRow>({
      accessorKey: 'barcode',
      header: 'Barcode',
      href: detailHref,
      value: (row) => row.barcode,
    }),
    {
      accessorKey: 'departed_at',
      header: sortableHeader<ModelPriceHistoryRow>('Date Sold'),
      cell: ({ row }) => formatDate(row.original.departed_at),
    },
    {
      accessorKey: 'purchase_price',
      header: sortableHeader<ModelPriceHistoryRow>('Purchase Price'),
      cell: ({ row }) => formatUSDWithSymbol(row.original.purchase_price),
    },
    {
      accessorKey: 'sale_price',
      header: sortableHeader<ModelPriceHistoryRow>('Sale Price'),
      cell: ({ row }) => formatUSDWithSymbol(row.original.sale_price),
    },
    {
      accessorKey: 'meter',
      header: sortableHeader<ModelPriceHistoryRow>('Meter'),
      cell: ({ row }) => formatThousandsK(row.original.meter),
    },
    {
      accessorKey: 'customer',
      header: sortableHeader<ModelPriceHistoryRow>('Customer'),
      cell: ({ row }) => formatTitleCase(row.original.customer ?? ''),
    },
    {
      accessorKey: 'salesperson',
      header: sortableHeader<ModelPriceHistoryRow>('Salesperson'),
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
