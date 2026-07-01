import { AssetFilterBar } from '@/components/custom/asset-filter-bar'
import { AssetIdentityFilters } from '@/components/custom/asset-identity-filters'
import { Toggle } from '@/components/shadcn/toggle'
import { useCan } from '@/hooks/use-can'
import { useSearchInStock } from '@/hooks/use-search-instock'
import {
  useAssetTypesParam,
  useBrandParam,
  usePriceCheckParam,
  useSharedAssetFilters,
} from '@/lib/filters/hooks'
import { useCallback, useMemo } from 'react'
import type { AssetSearchRow } from 'shared-types'
import { AssetSearchPage } from './asset-search-page'

const EMPTY_ASSETS: AssetSearchRow[] = []
const PURCHASE_COST_COLUMN_ID = 'cost_purchase_cost'
const PRICE_CHECK_COLUMN_IDS = [PURCHASE_COST_COLUMN_ID] as const

export function SearchInStockPage(): React.JSX.Element {
  const shared = useSharedAssetFilters()
  const [brand] = useBrandParam()
  const [assetTypes] = useAssetTypesParam()
  const [priceCheck, setPriceCheck] = usePriceCheckParam()

  const filters = useMemo(
    () => ({ ...shared, brand, assetTypes, priceCheck }),
    [shared, brand, assetTypes, priceCheck],
  )

  const canViewPurchasePrice = useCan('view_purchase_price')

  const { data: assets = EMPTY_ASSETS, isLoading, mutate } = useSearchInStock(filters)
  const handleBulkPriceSave = useCallback(() => {
    mutate()
  }, [mutate])

  const visibleAssets = useMemo(
    () =>
      priceCheck
        ? assets.filter((a) => a.cost_purchase_cost == null || a.cost_purchase_cost === 0)
        : assets,
    [assets, priceCheck],
  )

  return (
    <AssetSearchPage
      title="In Stock"
      navContext="instock"
      savedViewPageKey="search_instock"
      assets={visibleAssets}
      isLoading={isLoading}
      onBulkPriceSave={handleBulkPriceSave}
      forceVisibleColumnIds={priceCheck ? PRICE_CHECK_COLUMN_IDS : undefined}
    >
      <AssetFilterBar
        scopeSlot={
          canViewPurchasePrice ? (
            <Toggle
              variant="outline"
              pressed={priceCheck}
              onPressedChange={setPriceCheck}
              aria-label="Show only assets with a missing or zero purchase price"
            >
              Price Check
            </Toggle>
          ) : undefined
        }
        identitySlot={<AssetIdentityFilters />}
      />
    </AssetSearchPage>
  )
}
