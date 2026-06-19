import { AssetFilterBar } from '@/components/custom/asset-filter-bar'
import { AssetIdentityFilters } from '@/components/custom/asset-identity-filters'
import { useModelStore } from '@/data/store/model-store'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useDefaultWarehouseSelection } from '@/hooks/use-default-warehouse-selection'
import { useSearchInStock } from '@/hooks/use-search-instock'
import { useUrlFilters } from '@/hooks/use-url-filters'
import {
  filtersToParams,
  paramsToFilters,
} from '@/lib/search-instock-params'
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { AssetSearchRow } from 'shared-types'
import { AssetSearchPage } from './asset-search-page'

const EMPTY_ASSETS: AssetSearchRow[] = []

export function SearchInStockPage(): React.JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams()

  const models = useModelStore(state => state.models)
  const allBrands = useReferenceDataStore(state => state.brands)
  const allAssetTypes = useReferenceDataStore(state => state.assetTypes)
  const allReadinesses = useReferenceDataStore(state => state.readinesses)
  const allWarehouses = useReferenceDataStore(state => state.warehouses)
  const allComponents = useReferenceDataStore(state => state.components)
  const defaultWarehouses = useDefaultWarehouseSelection()

  const urlFilters = useMemo(
    () => paramsToFilters(searchParams, {
      warehouses: allWarehouses,
      brands: allBrands,
      assetTypes: allAssetTypes,
      models,
      readinesses: allReadinesses,
      components: allComponents,
    }, defaultWarehouses),
    [
      searchParams, allWarehouses, allBrands, allAssetTypes, models, allReadinesses,
      allComponents, defaultWarehouses,
    ],
  )

  const { draft, updateImmediate, updateDebounced } = useUrlFilters(
    urlFilters,
    filtersToParams,
    setSearchParams,
  )

  const { data: assets = EMPTY_ASSETS, isLoading, mutate } = useSearchInStock(urlFilters)
  const handleBulkPriceSave = useCallback(() => { mutate() }, [mutate])

  return (
    <AssetSearchPage
      title="In Stock"
      navContext="instock"
      savedViewPageKey="search_instock"
      assets={assets}
      isLoading={isLoading}
      onBulkPriceSave={handleBulkPriceSave}
    >
      <AssetFilterBar
        draft={draft}
        onImmediate={updateImmediate}
        onDebounced={updateDebounced}
        identitySlot={
          <AssetIdentityFilters
            draft={draft}
            onImmediate={updateImmediate}
            onDebounced={updateDebounced}
          />
        }
      />
    </AssetSearchPage>
  )
}
