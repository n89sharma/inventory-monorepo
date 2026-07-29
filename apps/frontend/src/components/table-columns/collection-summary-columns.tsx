import { AssetTypeBreakdown } from '@/components/shared/asset-type-breakdown'
import { formatDate } from '@/lib/formatters'
import type { ColumnDef } from '@tanstack/react-table'
import type { CollectionSummarySchema } from 'shared-types'
import { toColumnDefs, type SummaryColumn } from './summary-column'

// Factories rather than consts: TanStack's FilterFnOption is invariant in the row type, so a
// column fixed to CollectionSummarySchema cannot be reused in a table typed to a row that
// extends it.
type CollectionSummaryColumn<TRow extends CollectionSummarySchema, TContext> = SummaryColumn<
  TRow,
  TContext
>

function createdAtColumn<TRow extends CollectionSummarySchema, TContext>(): CollectionSummaryColumn<
  TRow,
  TContext
> {
  return {
    id: 'created_at',
    label: 'Date',
    text: (row) => formatDate(row.created_at),
    cell: (row) => (row.created_at ? formatDate(row.created_at) : '-'),
    sortable: true,
    size: 140,
  }
}

export function createdByColumn<
  TRow extends CollectionSummarySchema,
  TContext,
>(): CollectionSummaryColumn<TRow, TContext> {
  return {
    id: 'created_by',
    label: 'Created By',
    text: (row) => row.created_by,
    size: 120,
  }
}

export function assetCountColumn<
  TRow extends CollectionSummarySchema,
  TContext,
>(): CollectionSummaryColumn<TRow, TContext> {
  return {
    id: 'asset_count',
    label: 'Copiers / Total',
    csvHeader: 'Total',
    text: (row) => String(row.asset_count ?? 0),
    cell: (row) => <AssetTypeBreakdown summary={row} />,
    size: 110,
  }
}

// The other four collection summary pages still build plain ColumnDef arrays; they read these
// until they move to a registry of their own.
export const [createdAtColumnDef, createdByColumnDef, assetCountColumnDef]: ColumnDef<
  CollectionSummarySchema,
  unknown
>[] = toColumnDefs(
  [
    createdAtColumn<CollectionSummarySchema, unknown>(),
    createdByColumn<CollectionSummarySchema, unknown>(),
    assetCountColumn<CollectionSummarySchema, unknown>(),
  ],
  undefined,
)
