import { AssetBrowseFilters } from '@/components/custom/asset-browse-filters'
import { DepartedDateRangeFilter } from '@/components/filters/departed-date-range-filter'
import { Toggle } from '@/components/shadcn/toggle'
import { useModelStore } from '@/data/store/model-store'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useSearchSold } from '@/hooks/use-search-sold'
import { useUrlFilters } from '@/hooks/use-url-filters'
import {
  filtersToParams,
  paramsToFilters,
} from '@/lib/search-sold-params'
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { AssetSearchRow } from 'shared-types'
import { AssetSearchPage } from './asset-search-page'

const EMPTY_ASSETS: AssetSearchRow[] = []

export function SearchSoldPage(): React.JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams()

  const models = useModelStore(state => state.models)
  const allBrands = useReferenceDataStore(state => state.brands)
  const allAssetTypes = useReferenceDataStore(state => state.assetTypes)
  const allReadinesses = useReferenceDataStore(state => state.readinesses)
  const allWarehouses = useReferenceDataStore(state => state.warehouses)
  const allComponents = useReferenceDataStore(state => state.components)

  const urlFilters = useMemo(
    () => paramsToFilters(searchParams, {
      warehouses: allWarehouses,
      brands: allBrands,
      assetTypes: allAssetTypes,
      models,
      readinesses: allReadinesses,
      components: allComponents,
    }),
    [searchParams, allWarehouses, allBrands, allAssetTypes, models, allReadinesses, allComponents],
  )

  const { draft, updateImmediate, updateDebounced } = useUrlFilters(
    urlFilters,
    filtersToParams,
    setSearchParams,
  )

  const { data: assets = EMPTY_ASSETS, isLoading, mutate } = useSearchSold(urlFilters)
  const handleBulkPriceSave = useCallback(() => { mutate() }, [mutate])

  return (
    <AssetSearchPage
      title="Sold"
      navContext="sold"
      assets={assets}
      isLoading={isLoading}
      onBulkPriceSave={handleBulkPriceSave}
    >
      <AssetBrowseFilters
        draft={draft}
        onImmediate={updateImmediate}
        onDebounced={updateDebounced}
      >
        <Toggle
          variant="outline"
          pressed={draft.showOther}
          onPressedChange={v => updateImmediate({ ...draft, showOther: v })}
          aria-label="Show harvested and scrapped assets"
        >
          {draft.showOther ? 'Show Sold' : 'Show Harvested/Scrapped'}
        </Toggle>
        <DepartedDateRangeFilter
          value={draft.range}
          onValueChange={range => updateImmediate({ ...draft, range })}
        />
      </AssetBrowseFilters>
    </AssetSearchPage>
  )
}
