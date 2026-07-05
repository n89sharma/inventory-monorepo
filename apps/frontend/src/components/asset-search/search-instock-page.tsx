import { AssetFilterBar } from '@/components/asset-search/asset-filter-bar'
import { AssetSearchPage } from '@/components/asset-search/asset-search-page'
import { Toggle } from '@/components/shadcn/toggle'
import { WarehouseFilter } from '@/components/shared/filters/warehouse-filter'
import { useCan } from '@/hooks/use-can'
import { useDefaultAssetType } from '@/hooks/use-default-asset-type'
import { useSearchInStock } from '@/hooks/use-search-instock'
import {
  useAssetFilters,
  useAssetTypesParam,
  usePriceCheckParam,
  useWarehousesParam,
} from '@/lib/filters/hooks'
import { useCallback, useMemo } from 'react'
import type { AssetSearchRow } from 'shared-types'

const EMPTY_ASSETS: AssetSearchRow[] = []
const PURCHASE_COST_COLUMN_ID = 'cost_purchase_cost'
const PRICE_CHECK_COLUMN_IDS = [PURCHASE_COST_COLUMN_ID] as const

export function SearchInStockPage(): React.JSX.Element {
  const assetFilters = useAssetFilters()
  const [warehouses, setWarehouses] = useWarehousesParam()
  const [priceCheck, setPriceCheck] = usePriceCheckParam()
  const [, setAssetTypes] = useAssetTypesParam()
  const copierType = useDefaultAssetType()

  const handlePriceCheckChange = useCallback(
    (next: boolean) => {
      if (next && copierType) setAssetTypes([copierType])
      setPriceCheck(next)
    },
    [copierType, setAssetTypes, setPriceCheck],
  )

  const filters = useMemo(
    () => ({ ...assetFilters, warehouses, priceCheck }),
    [assetFilters, warehouses, priceCheck],
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
        scopeFilters={
          <>
            <WarehouseFilter selection={warehouses} onSelectionChange={setWarehouses} />
            {canViewPurchasePrice ? (
              <Toggle
                variant="outline"
                pressed={priceCheck}
                onPressedChange={handlePriceCheckChange}
                aria-label="Show only assets with a missing or zero purchase price"
              >
                $0 Price Check
              </Toggle>
            ) : undefined}
          </>
        }
      />
    </AssetSearchPage>
  )
}
