import { AssetFilterBar } from '@/components/custom/asset-filter-bar'
import { StickyPageHeader } from '@/components/custom/sticky-page-header'
import { PageContent } from '@/components/layout/page-content'
import { DEFAULT_VISIBLE_COLUMN_IDS_BY_LIST } from '@/components/pages/column-defs/asset-table-columns'
import { useModelStore } from '@/data/store/model-store'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useAssetSelection } from '@/hooks/use-asset-selection'
import { useColumnVisibility } from '@/hooks/use-column-visibility'
import { useSearchAll } from '@/hooks/use-search-all'
import { useUrlFilters } from '@/hooks/use-url-filters'
import { formatTitleCase } from '@/lib/formatters'
import { filtersToParams, paramsToFilters } from '@/lib/search-all-params'
import { assetDetailHref } from '@/ui-types/navigation-context'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ASSET_STATUS, type AssetSearchRow } from 'shared-types'
import { AssetResultsTable } from '../../custom/asset-results-table'
import { ColumnPickerButton } from '../../custom/column-picker-button'
import { ExportAssetsButton } from '../../custom/export-assets-button'
import { MultiSelectOptionsInline } from '../../custom/multi-select-options'
import { SavedViewsButton } from '../../custom/saved-views-button'
import { ShareButton } from '../../custom/share-button'

const EMPTY_ASSETS: AssetSearchRow[] = []
const STATUS_TOP_ORDER = [ASSET_STATUS.IN_STOCK, ASSET_STATUS.HELD, ASSET_STATUS.ON_ORDER] as const
const STATUS_DIVIDER_AFTER = new Set<string>([ASSET_STATUS.HELD, ASSET_STATUS.ON_ORDER])

export function SearchAllPage(): React.JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    visibleColumns,
    setVisibleColumns,
    columnVisibility,
    reset: resetColumns,
  } = useColumnVisibility(DEFAULT_VISIBLE_COLUMN_IDS_BY_LIST.all)

  const models = useModelStore((state) => state.models)
  const rawStatuses = useReferenceDataStore((state) => state.statuses)
  const allStatuses = useMemo(() => {
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
  const statusDividerAfterIds = useMemo(
    () => allStatuses.filter((s) => STATUS_DIVIDER_AFTER.has(s.status)).map((s) => s.id),
    [allStatuses],
  )
  const allReadinesses = useReferenceDataStore((state) => state.readinesses)
  const allWarehouses = useReferenceDataStore((state) => state.warehouses)
  const allComponents = useReferenceDataStore((state) => state.components)

  const urlFilters = useMemo(
    () =>
      paramsToFilters(searchParams, {
        models,
        statuses: allStatuses,
        readinesses: allReadinesses,
        warehouses: allWarehouses,
        components: allComponents,
      }),
    [searchParams, models, allStatuses, allReadinesses, allWarehouses, allComponents],
  )

  const { draft, updateImmediate, updateDebounced } = useUrlFilters(
    urlFilters,
    filtersToParams,
    setSearchParams,
  )

  const { data: assets = EMPTY_ASSETS, isLoading, mutate } = useSearchAll(urlFilters)
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
            draft={draft}
            onImmediate={updateImmediate}
            onDebounced={updateDebounced}
            modelPlaceholder="Model *"
            scopeSlot={
              <MultiSelectOptionsInline
                selection={draft.statuses}
                onSelectionChange={(s) => updateDebounced({ ...draft, statuses: s })}
                options={allStatuses}
                getLabel={(s) => formatTitleCase(s.status)}
                fieldLabel="Status"
                className="w-35"
                dividerAfterIds={statusDividerAfterIds}
              />
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
