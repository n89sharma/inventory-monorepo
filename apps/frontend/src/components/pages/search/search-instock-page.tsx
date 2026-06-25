import { AssetFilterBar } from '@/components/custom/asset-filter-bar'
import { AssetIdentityFilters } from '@/components/custom/asset-identity-filters'
import { Toggle } from '@/components/shadcn/toggle'
import { useModelStore } from '@/data/store/model-store'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useCan } from '@/hooks/use-can'
import { useSearchInStock } from '@/hooks/use-search-instock'
import { useUrlFilters } from '@/hooks/use-url-filters'
import { filtersToParams, paramsToFilters } from '@/lib/search-instock-params'
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { AssetSearchRow } from 'shared-types'
import { AssetSearchPage } from './asset-search-page'

const EMPTY_ASSETS: AssetSearchRow[] = []
const PURCHASE_COST_COLUMN_ID = 'cost_purchase_cost'
const PRICE_CHECK_COLUMN_IDS = [PURCHASE_COST_COLUMN_ID] as const

export function SearchInStockPage(): React.JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams()

  const models = useModelStore((state) => state.models)
  const allBrands = useReferenceDataStore((state) => state.brands)
  const allAssetTypes = useReferenceDataStore((state) => state.assetTypes)
  const allReadinesses = useReferenceDataStore((state) => state.readinesses)
  const allWarehouses = useReferenceDataStore((state) => state.warehouses)
  const allComponents = useReferenceDataStore((state) => state.components)

  const urlFilters = useMemo(
    () =>
      paramsToFilters(searchParams, {
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

  const canViewPurchasePrice = useCan('view_purchase_price')

  const { data: assets = EMPTY_ASSETS, isLoading, mutate } = useSearchInStock(urlFilters)
  const handleBulkPriceSave = useCallback(() => {
    mutate()
  }, [mutate])

  const visibleAssets = useMemo(
    () =>
      urlFilters.priceCheck
        ? assets.filter((a) => a.cost_purchase_cost == null || a.cost_purchase_cost === 0)
        : assets,
    [assets, urlFilters.priceCheck],
  )

  return (
    <AssetSearchPage
      title="In Stock"
      navContext="instock"
      savedViewPageKey="search_instock"
      assets={visibleAssets}
      isLoading={isLoading}
      onBulkPriceSave={handleBulkPriceSave}
      forceVisibleColumnIds={urlFilters.priceCheck ? PRICE_CHECK_COLUMN_IDS : undefined}
    >
      <AssetFilterBar
        draft={draft}
        onImmediate={updateImmediate}
        onDebounced={updateDebounced}
        scopeSlot={
          canViewPurchasePrice ? (
            <Toggle
              variant="outline"
              pressed={draft.priceCheck}
              onPressedChange={(v) => updateImmediate({ ...draft, priceCheck: v })}
              aria-label="Show only assets with a missing or zero purchase price"
            >
              Price Check
            </Toggle>
          ) : undefined
        }
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
