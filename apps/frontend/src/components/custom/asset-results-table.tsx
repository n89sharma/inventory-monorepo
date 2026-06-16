import { BulkEditBar } from '@/components/custom/bulk-edit-bar'
import { createAssetSearchColumns } from '@/components/pages/column-defs/asset-search-columns'
import { createSelectColumn } from '@/components/pages/column-defs/shared-columns'
import { DataTable } from '@/components/shadcn/data-table'
import type { OnChangeFn, RowSelectionState, VisibilityState } from '@tanstack/react-table'
import { memo, useMemo } from 'react'
import type { AssetSearchRow, AssetSummary } from 'shared-types'

const getAssetRowId = (row: AssetSearchRow) => row.barcode
const STOCK_DAYS_ASC_SORT = { id: 'stock_days', desc: false } as const
const PIN_LEFT = ['select', 'barcode', 'brand', 'model']

function toAssetSummary(r: AssetSearchRow): AssetSummary {
  return {
    id: r.id,
    barcode: r.barcode,
    brand: r.brand,
    model: r.model,
    asset_type: r.asset_type,
    serial_number: r.serial_number,
    meter_total: r.specs_meter_total,
    status: r.status,
    readiness: r.readiness,
    location: r.location,
    hold_number: r.hold_hold_number,
    purchase_invoice_number: r.purchase_invoice_invoice_number,
    is_in_transit: r.is_in_transit,
  }
}

export const AssetResultsTable = memo(function AssetResultsTable({
  assets,
  rowSelection,
  onRowSelectionChange,
  onBulkPriceSave,
  columnVisibility,
  getRowHref,
  defaultSort = STOCK_DAYS_ASC_SORT,
}: {
  assets: AssetSearchRow[]
  rowSelection: RowSelectionState
  onRowSelectionChange: OnChangeFn<RowSelectionState>
  onBulkPriceSave: () => void
  columnVisibility: VisibilityState
  getRowHref: (asset: AssetSearchRow) => string
  defaultSort?: { id: string; desc: boolean }
}) {
  const columns = useMemo(
    () => [createSelectColumn<AssetSearchRow>(), ...createAssetSearchColumns(getRowHref)],
    [getRowHref],
  )

  const selectedAssets: AssetSummary[] = assets
    .filter(a => rowSelection[a.barcode])
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
        pinLeft={PIN_LEFT}
        getRowHref={getRowHref}
        columnVisibility={columnVisibility}
      />
    </>
  )
})
