import { Button } from '@/components/shadcn/button'
import type { PriceCellEditorRegistry } from '@/lib/price-cell-navigation'
import { PencilSimpleIcon } from '@phosphor-icons/react'
import type { ColumnDef } from '@tanstack/react-table'
import type { AssetSearchRow, Permission } from 'shared-types'
import {
  IDENTITY_COLUMN_IDS,
  type AssetColumnId,
  type AssetWarningOf,
} from './asset-search-columns'
import { createSelectColumn } from './column-primitives'
import { createSearchPageColumns } from './search-page-columns'

export type CollectionSection = 'arrivals' | 'transfers' | 'departures' | 'invoices' | 'holds'

const GENERAL_SPEC_DEFAULT_COLUMN_IDS = [
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

const STATUS_DEFAULT_COLUMN_IDS = [
  'status',
  'readiness',
] as const satisfies readonly AssetColumnId[]

export const DEFAULT_VISIBLE_COLUMN_IDS_BY_SECTION = {
  arrivals: [
    ...IDENTITY_COLUMN_IDS,
    ...GENERAL_SPEC_DEFAULT_COLUMN_IDS,
    ...STATUS_DEFAULT_COLUMN_IDS,
    'purchase_invoice_invoice_reference',
  ],
  departures: [
    ...IDENTITY_COLUMN_IDS,
    ...GENERAL_SPEC_DEFAULT_COLUMN_IDS,
    ...PRICE_COLUMN_IDS,
    ...STATUS_DEFAULT_COLUMN_IDS,
    'sales_invoice_invoice_reference',
  ],
  transfers: [
    ...IDENTITY_COLUMN_IDS,
    ...GENERAL_SPEC_DEFAULT_COLUMN_IDS,
    ...STATUS_DEFAULT_COLUMN_IDS,
  ],
  invoices: [
    ...IDENTITY_COLUMN_IDS,
    ...GENERAL_SPEC_DEFAULT_COLUMN_IDS,
    ...PRICE_COLUMN_IDS,
    ...STATUS_DEFAULT_COLUMN_IDS,
    'latest_comment',
  ],
  holds: [
    ...IDENTITY_COLUMN_IDS,
    ...GENERAL_SPEC_DEFAULT_COLUMN_IDS,
    ...PRICE_COLUMN_IDS,
    ...STATUS_DEFAULT_COLUMN_IDS,
  ],
} as const satisfies Record<CollectionSection, readonly AssetColumnId[]>

function actionColumns(
  onEdit?: (asset: AssetSearchRow) => void,
  disabledRowId?: number | null,
): ColumnDef<AssetSearchRow>[] {
  if (!onEdit) return []
  return [
    {
      id: 'edit',
      meta: { reorderable: false, cellClassName: 'py-0' },
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="icon-sm"
          type="button"
          aria-label="Edit asset"
          onClick={() => onEdit(row.original)}
          disabled={disabledRowId === row.original.id}
        >
          <PencilSimpleIcon />
        </Button>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ]
}

export interface CollectionDetailColumnOptions {
  getHref: (asset: AssetSearchRow) => string
  can: (permission: Permission) => boolean
  onEdit?: (asset: AssetSearchRow) => void
  disabledRowId?: number | null
  priceEditorRegistry?: PriceCellEditorRegistry
  assetWarningOf?: AssetWarningOf
}

export function createCollectionDetailColumns({
  getHref,
  can,
  onEdit,
  disabledRowId,
  priceEditorRegistry,
  assetWarningOf,
}: CollectionDetailColumnOptions): ColumnDef<AssetSearchRow>[] {
  return [
    createSelectColumn<AssetSearchRow>(),
    ...createSearchPageColumns(getHref, can, priceEditorRegistry, assetWarningOf),
    ...actionColumns(onEdit, disabledRowId),
  ]
}
