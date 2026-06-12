import { StickyPageHeader } from "@/components/custom/sticky-page-header"
import { PageContent } from "@/components/layout/page-content"
import { useModelStore } from '@/data/store/model-store'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useSearchAll } from '@/hooks/use-search-all'
import { useAssetSelection } from '@/hooks/use-asset-selection'
import { useColumnVisibility } from '@/hooks/use-column-visibility'
import { useUrlFilters } from '@/hooks/use-url-filters'
import { formatSentenceCase } from '@/lib/formatters'
import {
  filtersToParams,
  paramsToFilters,
} from '@/lib/search-all-params'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { assetDetailHref } from '@/ui-types/navigation-context'
import type { AssetSearchRow } from 'shared-types'
import { AssetResultsTable } from '../../custom/asset-results-table'
import { CassettesFilter } from '../../custom/cassettes-filter'
import { ColumnPickerButton } from '../../custom/column-picker-button'
import { ExportAssetsButton } from '../../custom/export-assets-button'
import { InternalFinisherFilter } from '../../custom/internal-finisher-filter'
import { MeterRangeInput } from '../../custom/meter-range-input'
import { ModelFilter } from '../../custom/model-filter'
import { MultiSelectOptionsInline } from '../../custom/multi-select-options'
import { ReadinessFilter } from '../../custom/readiness-filter'
import { WarehouseFilter } from '../../custom/warehouse-filter'

const EMPTY_ASSETS: AssetSearchRow[] = []
const DEBOUNCE_MS = 600
const STATUS_TOP_ORDER = ['IN_STOCK', 'HELD', 'ON_ORDER'] as const
const STATUS_DIVIDER_AFTER = new Set<string>(['HELD', 'ON_ORDER'])

export function SearchAllPage(): React.JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams()
  const { visibleColumns, setVisibleColumns, columnVisibility, reset: resetColumns } =
    useColumnVisibility()

  const models = useModelStore(state => state.models)
  const rawStatuses = useReferenceDataStore(state => state.statuses)
  const allStatuses = useMemo(
    () => {
      const filtered = rawStatuses.filter(
        s => s.status != 'UNKNOWN' && s.status != 'LEASED',
      )
      const top: typeof filtered = []
      for (const key of STATUS_TOP_ORDER) {
        const found = filtered.find(s => s.status === key)
        if (found) top.push(found)
      }
      const rest = filtered.filter(s => !STATUS_TOP_ORDER.includes(s.status as typeof STATUS_TOP_ORDER[number]))
      return [...top, ...rest]
    },
    [rawStatuses]
  )
  const statusDividerAfterIds = useMemo(
    () => allStatuses.filter(s => STATUS_DIVIDER_AFTER.has(s.status)).map(s => s.id),
    [allStatuses],
  )
  const allReadinesses = useReferenceDataStore(state => state.readinesses)
  const allWarehouses = useReferenceDataStore(state => state.warehouses)
  const allComponents = useReferenceDataStore(state => state.components)

  const urlFilters = useMemo(
    () => paramsToFilters(searchParams, {
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
    DEBOUNCE_MS,
  )

  const { data: assets = EMPTY_ASSETS, isLoading, mutate } = useSearchAll(urlFilters)
  const selection = useAssetSelection(assets)
  const handleBulkPriceSave = useCallback(() => { mutate() }, [mutate])
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
          <WarehouseFilter
            selection={draft.warehouses}
            onSelectionChange={w => updateImmediate({
              ...draft, warehouses: w,
            })}
          />

          <ModelFilter
            selection={draft.model}
            query={draft.modelQuery ?? ''}
            onSelectionChange={m => updateImmediate({
              ...draft, model: m, modelQuery: null,
            })}
            onQueryChange={text => updateDebounced({
              ...draft,
              modelQuery: text.length > 0 ? text : null,
              model: null,
            })}
            onClear={() => updateImmediate({
              ...draft, model: null, modelQuery: null,
            })}
            placeholder='Model *'
          />

          <MultiSelectOptionsInline
            selection={draft.statuses}
            onSelectionChange={s => updateDebounced({ ...draft, statuses: s })}
            options={allStatuses}
            getLabel={s => formatSentenceCase(s.status)}
            fieldLabel='Status'
            className='w-45'
            dividerAfterIds={statusDividerAfterIds}
          />

          <ReadinessFilter
            selection={draft.readinesses}
            onSelectionChange={s => updateDebounced({ ...draft, readinesses: s })}
          />

          <MeterRangeInput
            min={draft.meterMin}
            max={draft.meterMax}
            onMinChange={val => updateDebounced({ ...draft, meterMin: val })}
            onMaxChange={val => updateDebounced({ ...draft, meterMax: val })}
            className='w-72'
          />

          <CassettesFilter
            value={draft.cassettes}
            onValueChange={val => updateDebounced({ ...draft, cassettes: val })}
          />

          <InternalFinisherFilter
            selection={draft.internalFinisher}
            onSelectionChange={c => updateImmediate({ ...draft, internalFinisher: c })}
            onClear={() => updateImmediate({ ...draft, internalFinisher: null })}
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
