import { createSearchPageColumns } from '@/components/table-columns/search-page-columns'
import {
  createSelectColumn,
  PINNED_ASSET_COLUMN_IDS,
} from '@/components/table-columns/column-primitives'
import { AssetResultsToolbar } from '@/components/shared/asset-results-toolbar'
import { DataGridWithoutResultCount } from '@/components/shared/data-table'
import { BulkEditBar, type RenderBulkExtraActions } from '@/components/collections/bulk-edit-bar'
import { useCan } from '@/hooks/use-can'
import type {
  ColumnOrderState,
  OnChangeFn,
  RowSelectionState,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table'
import { memo, useMemo } from 'react'
import { searchRowToAssetSummary, type AssetSearchRow, type AssetSummary } from 'shared-types'

const TABLE_LABEL = 'Assets'

const getAssetRowId = (row: AssetSearchRow) => row.barcode
const STOCK_DAYS_ASC_SORT = { id: 'stock_days', desc: false } as const

export const AssetResultsTable = memo(function AssetResultsTable({
  assets,
  rowSelection,
  onRowSelectionChange,
  onBulkPriceSave,
  columnVisibility,
  onColumnVisibilityChange,
  columnOrder,
  onColumnOrderChange,
  getRowHref,
  getRowClassName,
  defaultSort = STOCK_DAYS_ASC_SORT,
  sorting,
  onSortingChange,
  visibleColumns,
  onVisibleColumnsChange,
  onResetColumns,
  renderBulkExtraActions,
}: {
  assets: AssetSearchRow[]
  rowSelection: RowSelectionState
  onRowSelectionChange: OnChangeFn<RowSelectionState>
  onBulkPriceSave: () => void
  columnVisibility: VisibilityState
  onColumnVisibilityChange: OnChangeFn<VisibilityState>
  columnOrder: ColumnOrderState
  onColumnOrderChange: OnChangeFn<ColumnOrderState>
  getRowHref: (asset: AssetSearchRow) => string
  getRowClassName?: (asset: AssetSearchRow) => string | undefined
  defaultSort?: { id: string; desc: boolean }
  sorting?: SortingState
  onSortingChange?: OnChangeFn<SortingState>
  visibleColumns: Set<string>
  onVisibleColumnsChange: (next: Set<string>) => void
  onResetColumns: () => void
  renderBulkExtraActions?: RenderBulkExtraActions
}) {
  const can = useCan()
  const columns = useMemo(
    () => [createSelectColumn<AssetSearchRow>(), ...createSearchPageColumns(getRowHref, can)],
    [getRowHref, can],
  )

  const selectedRows = assets.filter((a) => rowSelection[a.barcode])
  const selectedAssets: AssetSummary[] = selectedRows.map(searchRowToAssetSummary)
  const clearSelection = () => onRowSelectionChange({})
  const extraActions = renderBulkExtraActions?.({ selectedAssets: selectedRows, clearSelection })

  function selectAllAssets() {
    const all: RowSelectionState = {}
    for (const asset of assets) all[asset.barcode] = true
    onRowSelectionChange(all)
  }

  return (
    <>
      <BulkEditBar
        selectedAssets={selectedAssets}
        onClear={clearSelection}
        onPriceSaveSuccess={onBulkPriceSave}
        totalCount={assets.length}
        onSelectAll={selectAllAssets}
        extraActionGroups={extraActions?.groups}
        extraDialogs={extraActions?.dialogs}
      />
      <DataGridWithoutResultCount
        label={TABLE_LABEL}
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
        columnOrder={columnOrder}
        onColumnOrderChange={onColumnOrderChange}
        renderToolbar={(table) => (
          <AssetResultsToolbar
            table={table}
            visibleColumns={visibleColumns}
            onVisibleColumnsChange={onVisibleColumnsChange}
            onResetColumns={onResetColumns}
          />
        )}
      />
    </>
  )
})
