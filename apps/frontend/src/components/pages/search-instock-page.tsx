import { StickyPageHeader } from "@/components/custom/sticky-page-header"
import { PageContent } from "@/components/layout/page-content"
import { useModelStore } from '@/data/store/model-store'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useSearchInStock } from '@/hooks/use-search-instock'
import {
  ASSET_TABLE_COLUMNS,
  DEFAULT_VISIBLE_COLUMN_IDS,
} from '@/components/pages/column-defs/asset-table-columns'
import { getReadinessDisplay } from '@/components/custom/readiness-icon'
import {
  filtersToParams,
  paramsToFilters,
  type SearchInStockFilters,
} from '@/lib/search-instock-params'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import type { VisibilityState } from '@tanstack/react-table'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { AssetSearchRow } from 'shared-types'
import { ColumnPickerButton } from '../custom/column-picker-button'
import { MeterRangeInput } from '../custom/meter-range-input'
import { ModelSearchInput } from '../custom/model-search-input'
import { MultiSelectOptionsInline } from '../custom/multi-select-options'
import { DataTable } from "../shadcn/data-table"
import { Toggle } from "../shadcn/toggle"
import { createAssetSearchColumns } from './column-defs/asset-search-columns'

const searchInStockColumns = createAssetSearchColumns(a => `/reports/stock/${a.barcode}`)
const getAssetRowId = (row: AssetSearchRow) => row.barcode
const defaultSort = { id: 'barcode', desc: true } as const
const EMPTY_ASSETS: AssetSearchRow[] = []
const DEBOUNCE_MS = 600
const PIN_LEFT = ['barcode', 'brand', 'model']

export function SearchInStockPage(): React.JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams()
  const [brandQuery, setBrandQuery] = useState('')
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(DEFAULT_VISIBLE_COLUMN_IDS),
  )
  const columnVisibility = useMemo<VisibilityState>(
    () => {
      const out: VisibilityState = {}
      for (const col of ASSET_TABLE_COLUMNS) {
        out[col.id] = visibleColumns.has(col.id)
      }
      return out
    },
    [visibleColumns],
  )

  const models = useModelStore(state => state.models)
  const allBrands = useReferenceDataStore(state => state.brands)
  const allAssetTypes = useReferenceDataStore(state => state.assetTypes)
  const allReadinesses = useReferenceDataStore(state => state.readinesses)
  const allWarehouses = useReferenceDataStore(state => state.warehouses)
  const activeWarehouses = useMemo(
    () => allWarehouses.filter(w => w.is_active),
    [allWarehouses],
  )

  const urlFilters = useMemo(
    () => paramsToFilters(searchParams, {
      warehouses: allWarehouses,
      brands: allBrands,
      assetTypes: allAssetTypes,
      models,
      readinesses: allReadinesses,
    }),
    [searchParams, allWarehouses, allBrands, allAssetTypes, models, allReadinesses],
  )

  const [draft, setDraft] = useState<SearchInStockFilters>(urlFilters)
  const [prevUrlFilters, setPrevUrlFilters] = useState(urlFilters)
  const debounceTimerRef = useRef<number | null>(null)
  const lastCommittedKeyRef = useRef<string>(filtersToParams(urlFilters).toString())

  if (urlFilters !== prevUrlFilters) {
    setPrevUrlFilters(urlFilters)
    const urlKey = filtersToParams(urlFilters).toString()
    if (urlKey !== lastCommittedKeyRef.current) {
      setDraft(urlFilters)
      lastCommittedKeyRef.current = urlKey
    }
  }

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  function commitNow(next: SearchInStockFilters) {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    const params = filtersToParams(next)
    lastCommittedKeyRef.current = params.toString()
    setSearchParams(params, { replace: true })
  }

  function scheduleCommit(next: SearchInStockFilters) {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null
      const params = filtersToParams(next)
      lastCommittedKeyRef.current = params.toString()
      setSearchParams(params, { replace: true })
    }, DEBOUNCE_MS)
  }

  function updateDraftImmediate(next: SearchInStockFilters) {
    setDraft(next)
    commitNow(next)
  }

  function updateDraftDebounced(next: SearchInStockFilters) {
    setDraft(next)
    scheduleCommit(next)
  }

  const { data: assets = EMPTY_ASSETS, isLoading } = useSearchInStock(urlFilters)

  return (
    <>
      <StickyPageHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Stock Report</h1>
            {isLoading && (
              <SpinnerGapIcon
                className="animate-spin text-muted-foreground"
                aria-label="Loading"
                role="status"
              />
            )}
          </div>
          <ColumnPickerButton
            visible={visibleColumns}
            onVisibleChange={setVisibleColumns}
            onReset={() => setVisibleColumns(new Set(DEFAULT_VISIBLE_COLUMN_IDS))}
          />
        </div>
        <form
          className="flex flex-row flex-wrap gap-2 items-end"
          onSubmit={e => e.preventDefault()}
        >
          <MultiSelectOptionsInline
            selection={draft.warehouses}
            onSelectionChange={w => updateDraftDebounced({ ...draft, warehouses: w })}
            options={activeWarehouses}
            getLabel={w => w.city_code}
            fieldLabel='Warehouse'
            className='w-45'
          />

          <ModelSearchInput
            selection={draft.brand}
            query={brandQuery}
            onSelectionChange={b => {
              setBrandQuery('')
              updateDraftImmediate({ ...draft, brand: b })
            }}
            onQueryChange={setBrandQuery}
            onClear={() => {
              setBrandQuery('')
              updateDraftImmediate({ ...draft, brand: null })
            }}
            options={allBrands}
            searchKey='name'
            getLabel={b => b.name}
            placeholder='Brand'
            clearLabel='Clear brand'
            className='w-45'
          />

          <MultiSelectOptionsInline
            selection={draft.assetTypes}
            onSelectionChange={a => updateDraftDebounced({ ...draft, assetTypes: a })}
            options={allAssetTypes}
            getLabel={a => a.asset_type}
            fieldLabel='Asset Type'
            className='w-45'
          />

          <ModelSearchInput
            selection={draft.model}
            query={draft.modelQuery ?? ''}
            onSelectionChange={m => updateDraftImmediate({
              ...draft, model: m, modelQuery: null,
            })}
            onQueryChange={text => updateDraftDebounced({
              ...draft,
              modelQuery: text.length > 0 ? text : null,
              model: null,
            })}
            onClear={() => updateDraftImmediate({
              ...draft, model: null, modelQuery: null,
            })}
            options={models}
            searchKey='model_name'
            getLabel={m => `${m.brand_name} ${m.model_name}`}
            placeholder='Model'
            className='w-45'
          />

          <MultiSelectOptionsInline
            selection={draft.readinesses}
            onSelectionChange={s => updateDraftDebounced({ ...draft, readinesses: s })}
            options={allReadinesses}
            getLabel={s => getReadinessDisplay(s.status)}
            fieldLabel='Readiness'
            className='w-45'
          />

          <MeterRangeInput
            min={draft.meterMin}
            max={draft.meterMax}
            onMinChange={val => updateDraftDebounced({ ...draft, meterMin: val })}
            onMaxChange={val => updateDraftDebounced({ ...draft, meterMax: val })}
            className='w-72'
          />

          <Toggle
            variant="outline"
            pressed={draft.includeHeld}
            onPressedChange={v => updateDraftImmediate({ ...draft, includeHeld: v })}
            aria-label="Include held assets"
          >
            {draft.includeHeld ? 'Hide Held' : 'Show Held'}
          </Toggle>
        </form>
      </StickyPageHeader>
      <PageContent className="flex flex-col gap-2">
        <div className={isLoading ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
          <DataTable
            columns={searchInStockColumns}
            data={assets}
            getRowId={getAssetRowId}
            defaultSort={defaultSort}
            pinLeft={PIN_LEFT}
            getRowHref={a => `/reports/stock/${a.barcode}`}
            columnVisibility={columnVisibility}
          />
        </div>
      </PageContent>
    </>
  )
}
