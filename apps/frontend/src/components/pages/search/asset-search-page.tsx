import { ColumnPickerButton } from '@/components/custom/column-picker-button'
import { ExportAssetsButton } from '@/components/custom/export-assets-button'
import { AssetResultsTable } from '@/components/custom/asset-results-table'
import { StickyPageHeader } from '@/components/custom/sticky-page-header'
import { PageContent } from '@/components/layout/page-content'
import { useAssetSelection } from '@/hooks/use-asset-selection'
import { useColumnVisibility } from '@/hooks/use-column-visibility'
import { assetDetailHref, type SearchList } from '@/ui-types/navigation-context'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { AssetSearchRow } from 'shared-types'

export function AssetSearchPage({
  title,
  navContext,
  assets,
  isLoading,
  onBulkPriceSave,
  children,
}: {
  title: string
  navContext: SearchList
  assets: AssetSearchRow[]
  isLoading: boolean
  onBulkPriceSave: () => void
  children: React.ReactNode
}): React.JSX.Element {
  const [searchParams] = useSearchParams()
  const { visibleColumns, setVisibleColumns, columnVisibility, reset: resetColumns } =
    useColumnVisibility()
  const selection = useAssetSelection(assets)
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
            <ExportAssetsButton
              loading={selection.exportLoading}
              disabled={selection.exportDisabled}
              onClick={selection.handleExport}
            />
          </div>
        </div>
        <form
          className="flex flex-row flex-wrap gap-2 items-end"
          onSubmit={e => e.preventDefault()}
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
            columnVisibility={columnVisibility}
            getRowHref={getRowHref}
          />
        </div>
      </PageContent>
    </>
  )
}
