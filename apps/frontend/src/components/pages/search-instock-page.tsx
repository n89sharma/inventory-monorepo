import { StickyPageHeader } from "@/components/custom/sticky-page-header"
import { PageContent } from "@/components/layout/page-content"
import { useModelStore } from '@/data/store/model-store'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useSearchInStock } from '@/hooks/use-search-instock'
import { useAssetSelection } from '@/hooks/use-asset-selection'
import { useColumnVisibility } from '@/hooks/use-column-visibility'
import { useUrlFilters } from '@/hooks/use-url-filters'
import {
  filtersToParams,
  paramsToFilters,
} from '@/lib/search-instock-params'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { AssetSearchRow } from 'shared-types'
import { AssetResultsTable } from '../custom/asset-results-table'
import { ColumnPickerButton } from '../custom/column-picker-button'
import { ExportAssetsButton } from '../custom/export-assets-button'
import { MeterRangeInput } from '../custom/meter-range-input'
import { ModelFilter } from '../custom/model-filter'
import { ModelSearchInput } from '../custom/model-search-input'
import { MultiSelectOptionsInline } from '../custom/multi-select-options'
import { ReadinessFilter } from '../custom/readiness-filter'
import { WarehouseFilter } from '../custom/warehouse-filter'
import { Toggle } from "../shadcn/toggle"

const getRowHref = (a: AssetSearchRow) => `/search/instock/${a.barcode}`
const EMPTY_ASSETS: AssetSearchRow[] = []
const DEBOUNCE_MS = 600

export function SearchInStockPage(): React.JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams()
  const [brandQuery, setBrandQuery] = useState('')
  const { visibleColumns, setVisibleColumns, columnVisibility, reset: resetColumns } =
    useColumnVisibility()

  const models = useModelStore(state => state.models)
  const allBrands = useReferenceDataStore(state => state.brands)
  const allAssetTypes = useReferenceDataStore(state => state.assetTypes)
  const allReadinesses = useReferenceDataStore(state => state.readinesses)
  const allWarehouses = useReferenceDataStore(state => state.warehouses)

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

  const { draft, updateImmediate, updateDebounced } = useUrlFilters(
    urlFilters,
    filtersToParams,
    setSearchParams,
    DEBOUNCE_MS,
  )

  const { data: assets = EMPTY_ASSETS, isLoading, mutate } = useSearchInStock(urlFilters)
  const selection = useAssetSelection(assets)
  const handleBulkPriceSave = useCallback(() => { mutate() }, [mutate])

  return (
    <>
      <StickyPageHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">In Stock</h1>
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
            onSelectionChange={w => updateDebounced({ ...draft, warehouses: w })}
          />

          <ModelSearchInput
            selection={draft.brand}
            query={brandQuery}
            onSelectionChange={b => {
              setBrandQuery('')
              updateImmediate({ ...draft, brand: b })
            }}
            onQueryChange={setBrandQuery}
            onClear={() => {
              setBrandQuery('')
              updateImmediate({ ...draft, brand: null })
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
            onSelectionChange={a => updateDebounced({ ...draft, assetTypes: a })}
            options={allAssetTypes}
            getLabel={a => a.asset_type}
            fieldLabel='Asset Type'
            className='w-45'
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

          <Toggle
            variant="outline"
            pressed={draft.includeHeld}
            onPressedChange={v => updateImmediate({ ...draft, includeHeld: v })}
            aria-label="Include held assets"
          >
            {draft.includeHeld ? 'Hide Held' : 'Show Held'}
          </Toggle>
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
