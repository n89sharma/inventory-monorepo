import { ColumnPickerButton } from '@/components/shared/column-picker-button'
import { TableTextFilter } from '@/components/shared/filters/table-text-filter'
import { TableToolbarEnd } from '@/components/shared/table-toolbar'
import type { AssetTypeCounts, AssetTypeFilter } from '@/lib/asset-type-filter'
import type { Table } from '@tanstack/react-table'
import type { AssetSearchRow } from 'shared-types'
import { AssetTypeFilterGroup } from './asset-type-filter-group'

const SEARCH_PLACEHOLDER = 'Search barcode, serial, model'
const SEARCH_CLEAR_LABEL = 'Clear search'
const SEARCH_CLASS = 'w-60'

export function CollectionAssetsToolbar({
  table,
  addAssetBar,
  assetTypeFilter,
  assetTypeCounts,
  onAssetTypeFilterChange,
  visibleColumns,
  onVisibleColumnsChange,
  onResetColumns,
}: {
  table: Table<AssetSearchRow>
  addAssetBar?: React.ReactNode
  assetTypeFilter: AssetTypeFilter
  assetTypeCounts: AssetTypeCounts
  onAssetTypeFilterChange: (value: AssetTypeFilter) => void
  visibleColumns: Set<string>
  onVisibleColumnsChange: (next: Set<string>) => void
  onResetColumns: () => void
}): React.JSX.Element {
  return (
    <>
      {addAssetBar}
      <TableToolbarEnd>
        <TableTextFilter
          table={table}
          placeholder={SEARCH_PLACEHOLDER}
          clearLabel={SEARCH_CLEAR_LABEL}
          className={SEARCH_CLASS}
        />
        <AssetTypeFilterGroup
          value={assetTypeFilter}
          counts={assetTypeCounts}
          onValueChange={onAssetTypeFilterChange}
        />
        <ColumnPickerButton
          visible={visibleColumns}
          onVisibleChange={onVisibleColumnsChange}
          onReset={onResetColumns}
        />
      </TableToolbarEnd>
    </>
  )
}
