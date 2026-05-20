import { StickyPageHeader } from "@/components/custom/sticky-page-header"
import { PageContent } from "@/components/layout/page-content"
import { Button } from "@/components/shadcn/button"
import { useAssetStore } from '@/data/store/asset-store'
import { useModelStore } from '@/data/store/model-store'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useSearchResults } from '@/hooks/use-search-results'
import {
  filtersToParams,
  MIN_QUERY_LENGTH,
  paramsToFilters,
  type SearchFilters,
} from '@/lib/search-url-params'
import { DownloadSimpleIcon, SpinnerGapIcon } from '@phosphor-icons/react'
import type { OnChangeFn, RowSelectionState } from '@tanstack/react-table'
import { memo, useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { AssetSummary } from 'shared-types'
import { toast } from 'sonner'
import { BulkEditBar } from '../custom/bulk-edit-bar'
import { InputWithClearInline } from '../custom/input-with-clear'
import { ModelSearchInput } from '../custom/model-search-input'
import { MultiSelectOptionsInline } from '../custom/multi-select-options'
import { DataTable } from "../shadcn/data-table"
import { createAssetSummaryColumns } from './column-defs/asset-summary-columns'

const searchColumns = createAssetSummaryColumns('search')
const getAssetRowId = (row: AssetSummary) => row.barcode
const defaultSort = { id: 'barcode', desc: true } as const
const EMPTY_ASSETS: AssetSummary[] = []

const QueryResultsTable = memo(function QueryResultsTable({
  assets,
  rowSelection,
  onRowSelectionChange,
  onBulkPriceSave,
}: {
  assets: AssetSummary[]
  rowSelection: RowSelectionState
  onRowSelectionChange: OnChangeFn<RowSelectionState>
  onBulkPriceSave: () => void
}) {
  const [prevAssets, setPrevAssets] = useState(assets)

  if (assets !== prevAssets) {
    setPrevAssets(assets)
    onRowSelectionChange({})
  }

  const selectedAssets = assets.filter(a => rowSelection[a.barcode])

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
        columns={searchColumns}
        data={assets}
        rowSelection={rowSelection}
        onRowSelectionChange={onRowSelectionChange}
        getRowId={getAssetRowId}
        defaultSort={defaultSort}
      />
    </>
  )
})

export function QueryPage(): React.JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams()
  const exportAssets = useAssetStore(state => state.exportAssets)
  const [exportLoading, setExportLoading] = useState(false)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const models = useModelStore(state => state.models)
  const allAvailabilityStatuses = useReferenceDataStore(state => state.availabilityStatuses)
  const allTechnicalStatuses = useReferenceDataStore(state => state.technicalStatuses)
  const allWarehouses = useReferenceDataStore(state => state.warehouses)
  const activeWarehouses = useMemo(
    () => allWarehouses.filter(w => w.is_active),
    [allWarehouses],
  )

  const urlFilters = useMemo(
    () => paramsToFilters(searchParams, {
      models,
      availabilityStatuses: allAvailabilityStatuses,
      technicalStatuses: allTechnicalStatuses,
      warehouses: allWarehouses,
    }),
    [searchParams, models, allAvailabilityStatuses, allTechnicalStatuses, allWarehouses],
  )

  const [draft, setDraft] = useState<SearchFilters>(urlFilters)
  const [prevUrlFilters, setPrevUrlFilters] = useState(urlFilters)
  if (urlFilters !== prevUrlFilters) {
    setPrevUrlFilters(urlFilters)
    setDraft(urlFilters)
  }

  const { data: assets = EMPTY_ASSETS, isLoading, mutate } = useSearchResults(urlFilters)
  const handleBulkPriceSave = useCallback(() => { mutate() }, [mutate])

  function submitQuery() {
    setSearchParams(filtersToParams(draft))
  }

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
  const hasSearchTarget = draft.model !== null
    || (draft.modelQuery !== null && draft.modelQuery.length >= MIN_QUERY_LENGTH)
  const searchDisabled = !hasSearchTarget || isLoading || exportLoading

  return (
    <>
      <StickyPageHeader>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Search</h1>
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
        <form
          className="flex flex-row flex-wrap gap-2 items-end"
          onSubmit={e => { e.preventDefault(); submitQuery() }}
        >
          <fieldset disabled={exportLoading} className="contents">
            <ModelSearchInput
              selection={draft.model}
              query={draft.modelQuery ?? ''}
              onSelectionChange={m => setDraft({ ...draft, model: m, modelQuery: null })}
              onQueryChange={text => setDraft({
                ...draft,
                modelQuery: text.length > 0 ? text : null,
                model: null,
              })}
              onClear={() => setDraft({ ...draft, model: null, modelQuery: null })}
              options={models}
              searchKey='model_name'
              getLabel={m => `${m.brand_name} ${m.model_name}`}
              placeholder='Model *'
              className='w-45'
            />

            <MultiSelectOptionsInline
              selection={draft.availabilityStatuses}
              onSelectionChange={s => setDraft({ ...draft, availabilityStatuses: s })}
              options={allAvailabilityStatuses}
              getLabel={s => s.status}
              fieldLabel='Availability'
              className='w-45'
            />

            <MultiSelectOptionsInline
              selection={draft.technicalStatuses}
              onSelectionChange={s => setDraft({ ...draft, technicalStatuses: s })}
              options={allTechnicalStatuses}
              getLabel={s => s.status}
              fieldLabel='Testing Status'
              className='w-45'
            />

            <MultiSelectOptionsInline
              selection={draft.selectedWarehouses}
              onSelectionChange={w => setDraft({ ...draft, selectedWarehouses: w })}
              options={activeWarehouses}
              getLabel={w => w.city_code}
              fieldLabel='Warehouse'
              className='w-45'
            />

            <InputWithClearInline
              value={draft.meter}
              onValueChange={val => setDraft({
                ...draft,
                meter: typeof val === 'string' ? null : val,
              })}
              fieldLabel='Meter'
              inputType='number'
              className='w-45'
            />

            <Button
              type="submit"
              disabled={searchDisabled}
            >
              Search
            </Button>
          </fieldset>
        </form>
      </StickyPageHeader>
      <PageContent className={`flex flex-col gap-2 ${Object.keys(rowSelection).length > 0 ? 'pb-24' : ''}`}>
        <div hidden={!isLoading} role="status" aria-live="polite">
          <span>Loading…</span>
        </div>
        <QueryResultsTable
          assets={assets}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          onBulkPriceSave={handleBulkPriceSave}
        />
      </PageContent>
    </>
  )
}
