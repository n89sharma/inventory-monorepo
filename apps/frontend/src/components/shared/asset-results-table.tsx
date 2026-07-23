import { createAssetSearchColumns } from '@/components/table-columns/search-page-columns'
import { createSelectColumn } from '@/components/table-columns/column-primitives'
import { DataTable } from '@/components/shadcn/data-table'
import { BulkEditBar } from '@/components/collections/bulk-edit-bar'
import type {
  OnChangeFn,
  RowSelectionState,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table'
import { memo, useMemo } from 'react'
import type { AssetSearchRow, AssetSummary } from 'shared-types'

const getAssetRowId = (row: AssetSearchRow) => row.barcode
const STOCK_DAYS_ASC_SORT = { id: 'stock_days', desc: false } as const
const PIN_LEFT = ['select', 'barcode', 'serial_number', 'model']

function toAssetSummary(r: AssetSearchRow): AssetSummary {
  return {
    id: r.id,
    barcode: r.barcode,
    brand: r.brand,
    model: r.model,
    asset_type: r.asset_type,
    serial_number: r.serial_number,
    meter_total: r.specs_meter_total,
    cassettes: r.specs_cassettes,
    internal_finisher: r.specs_internal_finisher,
    accessories: [],
    weight: 0,
    size: 0,
    status: r.status,
    readiness: r.readiness,
    location: r.location,
    hold_number: r.hold_hold_number,
    purchase_invoice_number: r.purchase_invoice_invoice_number,
    sales_invoice_number: null,
    is_in_transit: r.is_in_transit,
    created_at: r.created_at,
  }
}

export const AssetResultsTable = memo(function AssetResultsTable({
  assets,
  rowSelection,
  onRowSelectionChange,
  onBulkPriceSave,
  columnVisibility,
  getRowHref,
  getRowClassName,
  defaultSort = STOCK_DAYS_ASC_SORT,
  sorting,
  onSortingChange,
}: {
  assets: AssetSearchRow[]
  rowSelection: RowSelectionState
  onRowSelectionChange: OnChangeFn<RowSelectionState>
  onBulkPriceSave: () => void
  columnVisibility: VisibilityState
  getRowHref: (asset: AssetSearchRow) => string
  getRowClassName?: (asset: AssetSearchRow) => string | undefined
  defaultSort?: { id: string; desc: boolean }
  sorting?: SortingState
  onSortingChange?: OnChangeFn<SortingState>
}) {
  const columns = useMemo(
    () => [createSelectColumn<AssetSearchRow>(), ...createAssetSearchColumns(getRowHref)],
    [getRowHref],
  )

  const selectedAssets: AssetSummary[] = assets
    .filter((a) => rowSelection[a.barcode])
    .map(toAssetSummary)

  function selectAllAssets() {
    const all: RowSelectionState = {}
    for (const asset of assets) all[asset.barcode] = true
    onRowSelectionChange(all)
  }

  return (
    <>
      <BulkEditBar
        selectedAssets={selectedAssets}
        onClear={() => onRowSelectionChange({})}
        onPriceSaveSuccess={onBulkPriceSave}
        totalCount={assets.length}
        onSelectAll={selectAllAssets}
      />
      <DataTable
        columns={columns}
        data={assets}
        rowSelection={rowSelection}
        onRowSelectionChange={onRowSelectionChange}
        getRowId={getAssetRowId}
        defaultSort={defaultSort}
        sorting={sorting}
        onSortingChange={onSortingChange}
        pinLeft={PIN_LEFT}
        getRowHref={getRowHref}
        getRowClassName={getRowClassName}
        columnVisibility={columnVisibility}
      />
    </>
  )
})
