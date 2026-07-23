import { AssetTypeBreakdown } from '@/components/shared/asset-type-breakdown'
import { formatDate } from '@/lib/formatters'
import type { ColumnDef } from '@tanstack/react-table'
import type { CollectionSummarySchema } from 'shared-types'
import { sortableHeader } from './column-primitives'

export const createdAtColumn: ColumnDef<CollectionSummarySchema> = {
  accessorKey: 'created_at',
  cell: ({ getValue }) => {
    const date = getValue<Date>()
    return date ? formatDate(date) : '-'
  },
  header: sortableHeader<CollectionSummarySchema>('Date'),
  size: 140,
}

export const createdByColumn: ColumnDef<CollectionSummarySchema> = {
  accessorKey: 'created_by',
  header: 'Created By',
  size: 120,
}

export const assetCountColumn: ColumnDef<CollectionSummarySchema> = {
  accessorKey: 'asset_count',
  header: 'Copiers / Total',
  size: 110,
  cell: ({ row }) => <AssetTypeBreakdown summary={row.original} />,
}
