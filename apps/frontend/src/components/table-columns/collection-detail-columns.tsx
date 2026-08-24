import { Button } from '@/components/shadcn/button'
import type { PriceCellEditorRegistry } from '@/lib/price-cell-navigation'
import { PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react'
import type { ColumnDef } from '@tanstack/react-table'
import type { AssetSearchRow, Permission } from 'shared-types'
import type { AssetColumnId } from './asset-search-columns'
import { createSelectColumn } from './column-primitives'
import { createSearchPageColumns } from './search-page-columns'

export type CollectionSection = 'arrivals' | 'transfers' | 'departures' | 'invoices' | 'holds'

const COMMON_DEFAULT_COLUMN_IDS = [
  'status',
  'readiness',
  'specs_meter_total',
  'specs_cassettes',
  'specs_internal_finisher',
  'accessories',
] as const satisfies readonly AssetColumnId[]

const PRICE_COLUMN_IDS = [
  'cost_purchase_cost',
  'cost_transport_cost',
  'cost_processing_cost',
  'cost_total_cost',
  'cost_sale_price',
] as const satisfies readonly AssetColumnId[]

export const DEFAULT_VISIBLE_COLUMN_IDS_BY_SECTION = {
  arrivals: ['purchase_invoice_invoice_reference', ...COMMON_DEFAULT_COLUMN_IDS],
  departures: [
    'sales_invoice_invoice_reference',
    ...COMMON_DEFAULT_COLUMN_IDS,
    ...PRICE_COLUMN_IDS,
  ],
  transfers: [...COMMON_DEFAULT_COLUMN_IDS],
  invoices: [...COMMON_DEFAULT_COLUMN_IDS, ...PRICE_COLUMN_IDS, 'latest_comment'],
  holds: [...COMMON_DEFAULT_COLUMN_IDS, ...PRICE_COLUMN_IDS],
} as const satisfies Record<CollectionSection, readonly AssetColumnId[]>

function actionColumns(
  onEdit?: (asset: AssetSearchRow) => void,
  onDelete?: (asset: AssetSearchRow) => void,
  disabledRowId?: number | null,
): ColumnDef<AssetSearchRow>[] {
  const columns: ColumnDef<AssetSearchRow>[] = []
  if (onEdit) {
    columns.push({
      id: 'edit',
      meta: { reorderable: false },
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="icon"
          type="button"
          aria-label="Edit asset"
          onClick={() => onEdit(row.original)}
        >
          <PencilSimpleIcon />
        </Button>
      ),
      enableSorting: false,
      enableHiding: false,
    })
  }
  if (onDelete) {
    columns.push({
      id: 'delete',
      meta: { reorderable: false },
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="icon"
          type="button"
          aria-label="Remove asset"
          onClick={() => onDelete(row.original)}
          disabled={disabledRowId === row.original.id}
        >
          <TrashIcon />
        </Button>
      ),
      enableSorting: false,
      enableHiding: false,
    })
  }
  return columns
}

export interface CollectionDetailColumnOptions {
  getHref: (asset: AssetSearchRow) => string
  can: (permission: Permission) => boolean
  onDelete?: (asset: AssetSearchRow) => void
  onEdit?: (asset: AssetSearchRow) => void
  disabledRowId?: number | null
  priceEditorRegistry?: PriceCellEditorRegistry
}

export function createCollectionDetailColumns({
  getHref,
  can,
  onDelete,
  onEdit,
  disabledRowId,
  priceEditorRegistry,
}: CollectionDetailColumnOptions): ColumnDef<AssetSearchRow>[] {
  return [
    createSelectColumn<AssetSearchRow>(),
    ...createSearchPageColumns(getHref, can, priceEditorRegistry),
    ...actionColumns(onEdit, onDelete, disabledRowId),
  ]
}
