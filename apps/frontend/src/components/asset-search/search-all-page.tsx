import { PageContent } from '@/components/app-layout/page-content'
import { DEFAULT_VISIBLE_COLUMN_IDS_BY_LIST } from '@/components/table-columns/asset-table-columns'
import { StickyPageHeader } from '@/components/collections/sticky-page-header'
import { AssetFilterBar } from '@/components/asset-search/asset-filter-bar'
import { AssetResultsTable } from '@/components/shared/asset-results-table'
import { ColumnPickerButton } from '@/components/shared/column-picker-button'
import { ExportAssetsButton } from '@/components/shared/export-assets-button'
import { MultiSelectOptionsInline } from '@/components/shared/search-select/multi-select-options'
import { SavedViewsButton } from '@/components/shared/saved-views-button'
import { ShareButton } from '@/components/shared/share-button'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useAssetSelection } from '@/hooks/use-asset-selection'
import { useColumnVisibility } from '@/hooks/use-column-visibility'
import { useSearchAll } from '@/hooks/use-search-all'
import { useSharedAssetFilters, useStatusesParam } from '@/lib/filters/hooks'
import { formatTitleCase } from '@/lib/formatters'
import { assetDetailHref } from '@/ui-types/navigation-context'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ASSET_STATUS, type AssetSearchRow, type Status } from 'shared-types'

const EMPTY_ASSETS: AssetSearchRow[] = []
const STATUS_TOP_ORDER = [ASSET_STATUS.IN_STOCK, ASSET_STATUS.HELD, ASSET_STATUS.ON_ORDER] as const
const STATUS_DIVIDER_AFTER = new Set<string>([ASSET_STATUS.HELD, ASSET_STATUS.ON_ORDER])

function useOrderedStatuses(): { options: Status[]; dividerAfterIds: number[] } {
  const rawStatuses = useReferenceDataStore((state) => state.statuses)
  const options = useMemo(() => {
    const filtered = rawStatuses.filter(
      (s) => s.status != ASSET_STATUS.UNKNOWN && s.status != ASSET_STATUS.LEASED,
    )
    const top: typeof filtered = []
    for (const key of STATUS_TOP_ORDER) {
      const found = filtered.find((s) => s.status === key)
      if (found) top.push(found)
    }
    const rest = filtered.filter(
      (s) => !STATUS_TOP_ORDER.includes(s.status as (typeof STATUS_TOP_ORDER)[number]),
    )
    return [...top, ...rest]
  }, [rawStatuses])
  const dividerAfterIds = useMemo(
    () => options.filter((s) => STATUS_DIVIDER_AFTER.has(s.status)).map((s) => s.id),
    [options],
  )
  return { options, dividerAfterIds }
}

function StatusScopeFilter({
  options,
  dividerAfterIds,
}: {
  options: Status[]
  dividerAfterIds: number[]
}): React.JSX.Element {
  const [statuses, setStatuses] = useStatusesParam()
  return (
    <MultiSelectOptionsInline
      selection={statuses}
      onSelectionChange={setStatuses}
      options={options}
      getLabel={(s) => formatTitleCase(s.status)}
      fieldLabel="Status"
      className="w-35"
      dividerAfterIds={dividerAfterIds}
    />
  )
}

export function SearchAllPage(): React.JSX.Element {
  const [searchParams] = useSearchParams()
  const {
    visibleColumns,
    setVisibleColumns,
    columnVisibility,
    reset: resetColumns,
  } = useColumnVisibility(DEFAULT_VISIBLE_COLUMN_IDS_BY_LIST.all)

  const { options: statusOptions, dividerAfterIds: statusDividerAfterIds } = useOrderedStatuses()

  const shared = useSharedAssetFilters()
  const [statuses] = useStatusesParam()
  const filters = useMemo(() => ({ ...shared, statuses }), [shared, statuses])

  const { data: assets = EMPTY_ASSETS, isLoading, mutate } = useSearchAll(filters)
  const selection = useAssetSelection(assets, visibleColumns)
  const handleBulkPriceSave = useCallback(() => {
    mutate()
  }, [mutate])
  const getRowHref = useCallback(
    (a: AssetSearchRow) => assetDetailHref('all', a.barcode, searchParams),
    [searchParams],
  )

  return (
    <>
      <StickyPageHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">All Assets</h1>
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
            <SavedViewsButton pageKey="search_all" />
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
          <AssetFilterBar
            modelPlaceholder="Model *"
            scopeSlot={
              <StatusScopeFilter options={statusOptions} dividerAfterIds={statusDividerAfterIds} />
            }
          />
        </form>
      </StickyPageHeader>
      <PageContent className={`flex flex-col gap-2 ${selection.hasSelection ? 'pb-24' : ''}`}>
        <div className={isLoading ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
          <AssetResultsTable
            assets={assets}
            rowSelection={selection.rowSelection}
            onRowSelectionChange={selection.setRowSelection}
            onBulkPriceSave={handleBulkPriceSave}
            columnVisibility={columnVisibility}
            getRowHref={getRowHref}
          />
        </div>
      </PageContent>
    </>
  )
}
