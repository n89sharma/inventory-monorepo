import { PageContent } from '@/components/app-layout/page-content'
import { DEFAULT_VISIBLE_COLUMN_IDS_BY_LIST } from '@/components/table-columns/asset-table-columns'
import { StickyPageHeader } from '@/components/collections/sticky-page-header'
import { AssetResultsTable } from '@/components/shared/asset-results-table'
import { ColumnPickerButton } from '@/components/shared/column-picker-button'
import { ExportAssetsButton } from '@/components/shared/export-assets-button'
import { SavedViewsButton } from '@/components/shared/saved-views-button'
import { ShareButton } from '@/components/shared/share-button'
import { useAssetSelection } from '@/hooks/use-asset-selection'
import { useColumnVisibility } from '@/hooks/use-column-visibility'
import { assetDetailHref, type SearchList } from '@/ui-types/navigation-context'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import type { VisibilityState } from '@tanstack/react-table'
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { AssetSearchRow, SavedViewPageKey } from 'shared-types'

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
  forceVisibleColumnIds?: readonly string[]
  children: React.ReactNode
}): React.JSX.Element {
  const [searchParams] = useSearchParams()
  const {
    visibleColumns,
    setVisibleColumns,
    columnVisibility,
    reset: resetColumns,
  } = useColumnVisibility(DEFAULT_VISIBLE_COLUMN_IDS_BY_LIST[navContext])
  const selection = useAssetSelection(assets, visibleColumns)
  const effectiveColumnVisibility = useMemo<VisibilityState>(() => {
    if (!forceVisibleColumnIds?.length) return columnVisibility
    const out = { ...columnVisibility }
    for (const id of forceVisibleColumnIds) out[id] = true
    return out
  }, [columnVisibility, forceVisibleColumnIds])
  const getRowHref = useCallback(
    (a: AssetSearchRow) => assetDetailHref(navContext, a.barcode, searchParams),
    [navContext, searchParams],
  )

  return (
    <>
      <StickyPageHeader>
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
            <ColumnPickerButton
              visible={visibleColumns}
              onVisibleChange={setVisibleColumns}
              onReset={resetColumns}
            />
            <SavedViewsButton pageKey={savedViewPageKey} />
            <ShareButton />
            <ExportAssetsButton
              loading={selection.exportLoading}
              disabled={selection.exportDisabled}
              onClick={selection.handleExport}
            />
          </div>
        </div>
        <form
          className="flex flex-row flex-wrap gap-2 items-end"
          onSubmit={(e) => e.preventDefault()}
        >
          {children}
        </form>
      </StickyPageHeader>
      <PageContent className={`flex flex-col gap-2 ${selection.hasSelection ? 'pb-24' : ''}`}>
        <div className={isLoading ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
          <AssetResultsTable
            assets={assets}
            rowSelection={selection.rowSelection}
            onRowSelectionChange={selection.setRowSelection}
            onBulkPriceSave={onBulkPriceSave}
            columnVisibility={effectiveColumnVisibility}
            getRowHref={getRowHref}
            getRowClassName={getRowClassName}
            defaultSort={defaultSort}
          />
        </div>
      </PageContent>
    </>
  )
}
