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
import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { AssetSearchRow } from 'shared-types'
import { AssetResultsTable } from '../../custom/asset-results-table'
import { ColumnPickerButton } from '../../custom/column-picker-button'
import { ExportAssetsButton } from '../../custom/export-assets-button'
import { InputWithClearInline } from '../../custom/input-with-clear'
import { MeterRangeInput } from '../../custom/meter-range-input'
import { ModelFilter } from '../../custom/model-filter'
import { ModelSearchInput } from '../../custom/model-search-input'
import { MultiSelectOptionsInline } from '../../custom/multi-select-options'
import { ReadinessFilter } from '../../custom/readiness-filter'
import { WarehouseFilter } from '../../custom/warehouse-filter'

const getRowHref = (a: AssetSearchRow) => `/search/all/${a.barcode}`
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

  const [finisherQuery, setFinisherQuery] = useState('')
  const { draft, updateImmediate, updateDebounced } = useUrlFilters(
    urlFilters,
    filtersToParams,
    setSearchParams,
    DEBOUNCE_MS,
  )

  const { data: assets = EMPTY_ASSETS, isLoading, mutate } = useSearchAll(urlFilters)
  const selection = useAssetSelection(assets)
  const handleBulkPriceSave = useCallback(() => { mutate() }, [mutate])

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

          <WarehouseFilter
            selection={draft.selectedWarehouses}
            onSelectionChange={w => updateDebounced({
              ...draft, selectedWarehouses: w,
            })}
          />

          <MeterRangeInput
            min={draft.meterMin}
            max={draft.meterMax}
            onMinChange={val => updateDebounced({ ...draft, meterMin: val })}
            onMaxChange={val => updateDebounced({ ...draft, meterMax: val })}
            className='w-72'
          />

          <InputWithClearInline
            value={draft.cassettes}
            onValueChange={val => {
              const next = typeof val === 'string' || val === null
                ? null
                : Number.isInteger(val) && val >= 0 ? val : null
              updateDebounced({ ...draft, cassettes: next })
            }}
            fieldLabel='Cassettes (min)'
            inputType='number'
            className='w-45'
          />

          <ModelSearchInput
            selection={draft.internalFinisher}
            query={finisherQuery}
            onSelectionChange={c => {
              setFinisherQuery('')
              updateImmediate({ ...draft, internalFinisher: c })
            }}
            onQueryChange={setFinisherQuery}
            onClear={() => {
              setFinisherQuery('')
              updateImmediate({ ...draft, internalFinisher: null })
            }}
            options={allComponents}
            searchKey='name'
            getLabel={c => `${c.brand_name} — ${c.name}`}
            placeholder='Internal Finisher'
            clearLabel='Clear internal finisher'
            className='w-45'
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
