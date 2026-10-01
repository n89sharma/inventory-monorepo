import { BULK_ACTION_BAR_CLEARANCE_CLASS } from '@/components/collections/bulk-action-bar'
import { GridPageContent, PageSection } from '@/components/app-layout/page-content'
import { GridPageHeader } from '@/components/app-layout/sticky-page-header'
import type { RenderBulkExtraActions } from '@/components/collections/bulk-edit-bar'
import { AssetResultsTable } from '@/components/shared/asset-results-table'
import { ExportCsvButton } from '@/components/shared/export-csv-button'
import { SavedViewsButton } from '@/components/shared/saved-views-button'
import { ShareButton } from '@/components/shared/share-button'
import { useAssetSelection } from '@/hooks/use-asset-selection'
import {
  DEFAULT_VISIBLE_COLUMN_IDS_BY_LIST,
  type AssetColumnId,
} from '@/components/table-columns/asset-search-columns'
import { useAssetColumnVisibilityParam } from '@/hooks/use-asset-column-visibility-param'
import { useTableSortParam } from '@/hooks/use-table-sort-param'
import { searchListAssetDetailHref, type SearchList } from '@/ui-types/navigation-context'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import { useOptimisticSearchParams } from 'nuqs/adapters/react-router/v7'
import { useCallback } from 'react'
import type { AssetSearchRow, SavedViewPageKey } from 'shared-types'

const DEFAULT_ASSET_SORT = { id: 'stock_days', desc: false } as const

export function AssetSearchPage({
  title,
  navContext,
  savedViewPageKey,
  assets,
  isLoading,
  onBulkPriceSave,
  defaultSort,
  getRowClassName,
  forceVisibleColumnIds,
  summaryStrip,
  renderBulkExtraActions,
  children,
}: {
  title: string
  navContext: SearchList
  savedViewPageKey: SavedViewPageKey
  assets: AssetSearchRow[]
  isLoading: boolean
  onBulkPriceSave: () => void
  defaultSort?: { id: string; desc: boolean }
  getRowClassName?: (asset: AssetSearchRow) => string | undefined
  forceVisibleColumnIds?: readonly AssetColumnId[]
  summaryStrip?: React.ReactNode
  renderBulkExtraActions?: RenderBulkExtraActions
  children: React.ReactNode
}): React.JSX.Element {
  const searchParams = useOptimisticSearchParams()
  const {
    visibleColumns,
    setVisibleColumns,
    columnVisibility,
    onColumnVisibilityChange,
    displayOrder,
    onColumnOrderChange,
    reset: resetColumns,
  } = useAssetColumnVisibilityParam(
    DEFAULT_VISIBLE_COLUMN_IDS_BY_LIST[navContext],
    forceVisibleColumnIds,
  )
  const [sorting, onSortingChange] = useTableSortParam(defaultSort ?? DEFAULT_ASSET_SORT)
  const selection = useAssetSelection(assets, displayOrder, `${navContext}-assets.csv`)
  const getRowHref = useCallback(
    (a: AssetSearchRow) => searchListAssetDetailHref(navContext, a.barcode, searchParams),
    [navContext, searchParams],
  )

  return (
    <GridPageContent className={selection.hasSelection ? BULK_ACTION_BAR_CLEARANCE_CLASS : ''}>
      <GridPageHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{title}</h1>
            {isLoading && (
              <SpinnerGapIcon
                className="animate-spin text-muted-foreground"
                aria-label="Loading"
                role="status"
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <SavedViewsButton pageKey={savedViewPageKey} visibleColumns={visibleColumns} />
            <ShareButton />
            <ExportCsvButton
              loading={selection.exportLoading}
              disabled={selection.exportDisabled}
              onClick={selection.handleExport}
            />
          </div>
        </div>
        <form className="flex flex-col gap-2" onSubmit={(e) => e.preventDefault()}>
          {children}
        </form>
      </GridPageHeader>
      {summaryStrip && <PageSection>{summaryStrip}</PageSection>}
      <div
        className={`flex min-h-0 flex-1 flex-col ${isLoading ? 'opacity-50 transition-opacity' : 'transition-opacity'}`}
      >
        <AssetResultsTable
          assets={assets}
          rowSelection={selection.rowSelection}
          onRowSelectionChange={selection.setRowSelection}
          onBulkPriceSave={onBulkPriceSave}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={onColumnVisibilityChange}
          columnOrder={displayOrder}
          onColumnOrderChange={onColumnOrderChange}
          getRowHref={getRowHref}
          getRowClassName={getRowClassName}
          defaultSort={defaultSort}
          sorting={sorting}
          onSortingChange={onSortingChange}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={setVisibleColumns}
          onResetColumns={resetColumns}
          renderBulkExtraActions={renderBulkExtraActions}
        />
      </div>
    </GridPageContent>
  )
}
