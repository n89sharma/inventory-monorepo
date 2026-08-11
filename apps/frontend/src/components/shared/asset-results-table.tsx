import { createSearchPageColumns } from '@/components/table-columns/search-page-columns'
import {
  createSelectColumn,
  PINNED_ASSET_COLUMN_IDS,
} from '@/components/table-columns/column-primitives'
import { DataTable } from '@/components/shared/data-table'
import { BulkEditBar } from '@/components/collections/bulk-edit-bar'
import { useCan } from '@/hooks/use-can'
import type {
  OnChangeFn,
  RowSelectionState,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table'
import { memo, useMemo } from 'react'
import { searchRowToAssetSummary, type AssetSearchRow, type AssetSummary } from 'shared-types'

const getAssetRowId = (row: AssetSearchRow) => row.barcode
const STOCK_DAYS_ASC_SORT = { id: 'stock_days', desc: false } as const

export const AssetResultsTable = memo(function AssetResultsTable({
  assets,
  rowSelection,
  onRowSelectionChange,
  onBulkPriceSave,
  columnVisibility,
  onColumnVisibilityChange,
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
  onColumnVisibilityChange: OnChangeFn<VisibilityState>
  getRowHref: (asset: AssetSearchRow) => string
  getRowClassName?: (asset: AssetSearchRow) => string | undefined
  defaultSort?: { id: string; desc: boolean }
  sorting?: SortingState
  onSortingChange?: OnChangeFn<SortingState>
}) {
  const can = useCan()
  const columns = useMemo(
    () => [createSelectColumn<AssetSearchRow>(), ...createSearchPageColumns(getRowHref, can)],
    [getRowHref, can],
  )

  const selectedAssets: AssetSummary[] = assets
    .filter((a) => rowSelection[a.barcode])
    .map(searchRowToAssetSummary)

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
        pinLeft={PINNED_ASSET_COLUMN_IDS}
        getRowHref={getRowHref}
        getRowClassName={getRowClassName}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={onColumnVisibilityChange}
      />
    </>
  )
})
