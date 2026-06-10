import { StickyPageHeader } from "@/components/custom/sticky-page-header"
import { PageContent } from "@/components/layout/page-content"
import { Button } from "@/components/shadcn/button"
import { useAssetStore } from '@/data/store/asset-store'
import { useModelStore } from '@/data/store/model-store'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useSearchResults } from '@/hooks/use-search-results'
import {
  DEFAULT_VISIBLE_COLUMN_IDS,
  PICKABLE_COLUMNS,
} from '@/components/pages/column-defs/pickable-columns'
import { getReadinessDisplay } from '@/components/custom/readiness-icon'
import { formatSentenceCase } from '@/lib/formatters'
import {
  filtersToParams,
  paramsToFilters,
  type SearchFilters,
} from '@/lib/search-url-params'
import { DownloadSimpleIcon, SpinnerGapIcon } from '@phosphor-icons/react'
import type { OnChangeFn, RowSelectionState, VisibilityState } from '@tanstack/react-table'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { AssetSearchRow, AssetSummary } from 'shared-types'
import { toast } from 'sonner'
import { BulkEditBar } from '../../custom/bulk-edit-bar'
import { ColumnPickerButton } from '../../custom/column-picker-button'
import { InputWithClearInline } from '../../custom/input-with-clear'
import { MeterRangeInput } from '../../custom/meter-range-input'
import { ModelSearchInput } from '../../custom/model-search-input'
import { MultiSelectOptionsInline } from '../../custom/multi-select-options'
import { DataTable } from "../../shadcn/data-table"
import { createAssetSearchColumns } from '../column-defs/asset-search-columns'
import { createSelectColumn } from '../column-defs/shared-columns'

const assetSearchColumns = [
  createSelectColumn<AssetSearchRow>(),
  ...createAssetSearchColumns(a => `/search/${a.barcode}`),
]

const getAssetRowId = (row: AssetSearchRow) => row.barcode

function toAssetSummary(r: AssetSearchRow): AssetSummary {
  return {
    id: r.id,
    barcode: r.barcode,
    brand: r.brand,
    model: r.model,
    asset_type: r.asset_type,
    serial_number: r.serial_number,
    meter_total: r.specs_meter_total,
    status: r.status,
    readiness: r.readiness,
    location: r.location,
    hold_number: r.hold_hold_number,
    purchase_invoice_number: r.purchase_invoice_invoice_number,
    is_in_transit: r.is_in_transit,
  }
}
const defaultSort = { id: 'barcode', desc: true } as const
const EMPTY_ASSETS: AssetSearchRow[] = []
const DEBOUNCE_MS = 600
const PIN_LEFT = ['select', 'barcode', 'brand', 'model']
const STATUS_TOP_ORDER = ['IN_STOCK', 'HELD', 'ON_ORDER'] as const
const STATUS_DIVIDER_AFTER = new Set<string>(['HELD', 'ON_ORDER'])

const QueryResultsTable = memo(function QueryResultsTable({
  assets,
  rowSelection,
  onRowSelectionChange,
  onBulkPriceSave,
  columnVisibility,
}: {
  assets: AssetSearchRow[]
  rowSelection: RowSelectionState
  onRowSelectionChange: OnChangeFn<RowSelectionState>
  onBulkPriceSave: () => void
  columnVisibility: VisibilityState
}) {
  const [prevAssets, setPrevAssets] = useState(assets)

  if (assets !== prevAssets) {
    setPrevAssets(assets)
    onRowSelectionChange({})
  }

  const selectedAssets: AssetSummary[] = assets
    .filter(a => rowSelection[a.barcode])
    .map(toAssetSummary)

  function selectAllAssets() {
    const all: RowSelectionState = {}
    for (const asset of assets) all[asset.barcode] = true
    onRowSelectionChange(all)
  }

  return (
    <>
      <BulkEditBar
        selectedAssets={selectedAssets}
        onClear={() => onRowSelectionChange({})}
        onPriceSaveSuccess={onBulkPriceSave}
        totalCount={assets.length}
        onSelectAll={selectAllAssets}
      />
      <DataTable
        columns={assetSearchColumns}
        data={assets}
        rowSelection={rowSelection}
        onRowSelectionChange={onRowSelectionChange}
        getRowId={getAssetRowId}
        defaultSort={defaultSort}
        pinLeft={PIN_LEFT}
        getRowHref={a => `/search/${a.barcode}`}
        columnVisibility={columnVisibility}
      />
    </>
  )
})

export function QueryPage(): React.JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams()
  const exportAssets = useAssetStore(state => state.exportAssets)
  const [exportLoading, setExportLoading] = useState(false)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(DEFAULT_VISIBLE_COLUMN_IDS),
  )
  const columnVisibility = useMemo<VisibilityState>(
    () => {
      const out: VisibilityState = {}
      for (const col of PICKABLE_COLUMNS) {
        out[col.id] = visibleColumns.has(col.id)
      }
      return out
    },
    [visibleColumns],
  )

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
  const activeWarehouses = useMemo(
    () => allWarehouses.filter(w => w.is_active),
    [allWarehouses],
  )

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

  const [draft, setDraft] = useState<SearchFilters>(urlFilters)
  const [finisherQuery, setFinisherQuery] = useState('')
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

  function commitNow(next: SearchFilters) {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    const params = filtersToParams(next)
    lastCommittedKeyRef.current = params.toString()
    setSearchParams(params, { replace: true })
  }

  function scheduleCommit(next: SearchFilters) {
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

  function updateDraftImmediate(next: SearchFilters) {
    setDraft(next)
    commitNow(next)
  }

  function updateDraftDebounced(next: SearchFilters) {
    setDraft(next)
    scheduleCommit(next)
  }

  const { data: assets = EMPTY_ASSETS, isLoading, mutate } = useSearchResults(urlFilters)
  const handleBulkPriceSave = useCallback(() => { mutate() }, [mutate])

  async function handleExport() {
    const selectedBarcodes = Object.keys(rowSelection)
    const barcodesToExport = selectedBarcodes.length > 0
      ? selectedBarcodes
      : assets.map(a => a.barcode)

    if (barcodesToExport.length > 2000) {
      toast.error('Please select 2000 assets or less', { position: 'top-center' })
      return
    }

    setExportLoading(true)
    try {
      await exportAssets(barcodesToExport)
    } catch {
      toast.error('Failed to export assets', { position: 'top-center' })
    } finally {
      setExportLoading(false)
    }
  }

  const exportDisabled = assets.length === 0 || exportLoading

  return (
    <>
      <StickyPageHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Search</h1>
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
              onReset={() => setVisibleColumns(new Set(DEFAULT_VISIBLE_COLUMN_IDS))}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleExport}
              disabled={exportDisabled}
              aria-label="Export to CSV"
            >
              {exportLoading
                ? <SpinnerGapIcon className="animate-spin" />
                : <DownloadSimpleIcon />}
            </Button>
          </div>
        </div>
        <form
          className="flex flex-row flex-wrap gap-2 items-end"
          onSubmit={e => e.preventDefault()}
        >
          <fieldset disabled={exportLoading} className="contents">
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
              placeholder='Model *'
              clearLabel='Clear model'
              className='w-45'
            />

            <MultiSelectOptionsInline
              selection={draft.statuses}
              onSelectionChange={s => updateDraftDebounced({ ...draft, statuses: s })}
              options={allStatuses}
              getLabel={s => formatSentenceCase(s.status)}
              fieldLabel='Status'
              className='w-45'
              dividerAfterIds={statusDividerAfterIds}
            />

            <MultiSelectOptionsInline
              selection={draft.readinesses}
              onSelectionChange={s => updateDraftDebounced({ ...draft, readinesses: s })}
              options={allReadinesses}
              getLabel={s => getReadinessDisplay(s.status)}
              fieldLabel='Readiness'
              className='w-45'
            />

            <MultiSelectOptionsInline
              selection={draft.selectedWarehouses}
              onSelectionChange={w => updateDraftDebounced({
                ...draft, selectedWarehouses: w,
              })}
              options={activeWarehouses}
              getLabel={w => w.city_code}
              fieldLabel='Warehouse'
              className='w-45'
            />

            <MeterRangeInput
              min={draft.meterMin}
              max={draft.meterMax}
              onMinChange={val => updateDraftDebounced({ ...draft, meterMin: val })}
              onMaxChange={val => updateDraftDebounced({ ...draft, meterMax: val })}
              className='w-72'
            />

            <InputWithClearInline
              value={draft.cassettes}
              onValueChange={val => {
                const next = typeof val === 'string' || val === null
                  ? null
                  : Number.isInteger(val) && val >= 0 ? val : null
                updateDraftDebounced({ ...draft, cassettes: next })
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
                updateDraftImmediate({ ...draft, internalFinisher: c })
              }}
              onQueryChange={setFinisherQuery}
              onClear={() => {
                setFinisherQuery('')
                updateDraftImmediate({ ...draft, internalFinisher: null })
              }}
              options={allComponents}
              searchKey='name'
              getLabel={c => `${c.brand_name} — ${c.name}`}
              placeholder='Internal Finisher'
              clearLabel='Clear internal finisher'
              className='w-45'
            />
          </fieldset>
        </form>
      </StickyPageHeader>
      <PageContent className={`flex flex-col gap-2 ${Object.keys(rowSelection).length > 0 ? 'pb-24' : ''}`}>
        <div className={isLoading ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
          <QueryResultsTable
            assets={assets}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            onBulkPriceSave={handleBulkPriceSave}
            columnVisibility={columnVisibility}
          />
        </div>
      </PageContent>
    </>
  )
}
