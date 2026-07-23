import { AssetFilterBar } from '@/components/asset-search/asset-filter-bar'
import { AssetSearchPage } from '@/components/asset-search/asset-search-page'
import { Toggle } from '@/components/shadcn/toggle'
import { CustomerFilter } from '@/components/shared/filters/customer-filter'
import { UserFilter } from '@/components/shared/filters/user-filter'
import { WarehouseFilter } from '@/components/shared/filters/warehouse-filter'
import { daysHeld } from '@/components/table-columns/search-page-columns'
import { useCan } from '@/hooks/use-can'
import { useDefaultAssetType } from '@/hooks/use-default-asset-type'
import { useSearchOnHand } from '@/hooks/use-search-onhand'
import {
  useAssetFilters,
  useAssetTypesParam,
  useHeldByParam,
  useHeldForParam,
  useHoldCustomerParam,
  useInStockOnlyParam,
  usePriceCheckParam,
  useWarehousesParam,
} from '@/lib/filters/hooks'
import { useCallback, useMemo } from 'react'
import { ASSET_STATUS, type AssetSearchRow } from 'shared-types'

const EMPTY_ASSETS: AssetSearchRow[] = []
const CREATED_AT_DESC_SORT = { id: 'created_at', desc: true } as const
const PURCHASE_COST_COLUMN_ID = 'cost_purchase_cost'
const PRICE_CHECK_COLUMN_IDS = [PURCHASE_COST_COLUMN_ID] as const
const DAYS_HELD_WARNING_THRESHOLD = 30
const ROW_WARNING_CLASS = 'data-row-warning'

function heldRowClassName(asset: AssetSearchRow): string | undefined {
  const days = daysHeld(asset.hold_created_at)
  return days !== undefined && days > DAYS_HELD_WARNING_THRESHOLD ? ROW_WARNING_CLASS : undefined
}

export function SearchOnHandPage(): React.JSX.Element {
  const assetFilters = useAssetFilters()
  const [warehouses, setWarehouses] = useWarehousesParam()
  const [inStockOnly, setInStockOnly] = useInStockOnlyParam()
  const [priceCheck, setPriceCheck] = usePriceCheckParam()
  const [, setAssetTypes] = useAssetTypesParam()
  const [heldBy, setHeldBy] = useHeldByParam()
  const [heldFor, setHeldFor] = useHeldForParam()
  const [holdCustomer, setHoldCustomer] = useHoldCustomerParam()
  const copierType = useDefaultAssetType()

  const handlePriceCheckChange = useCallback(
    (next: boolean) => {
      if (next && copierType) setAssetTypes([copierType])
      setPriceCheck(next)
    },
    [copierType, setAssetTypes, setPriceCheck],
  )

  const filters = useMemo(
    () => ({ ...assetFilters, warehouses, priceCheck, heldBy, heldFor, holdCustomer }),
    [assetFilters, warehouses, priceCheck, heldBy, heldFor, holdCustomer],
  )

  const canViewPurchasePrice = useCan('view_purchase_price')

  const { data: assets = EMPTY_ASSETS, isLoading, mutate } = useSearchOnHand(filters)
  const handleBulkPriceSave = useCallback(() => {
    mutate()
  }, [mutate])

  const visibleAssets = useMemo(
    () =>
      assets.filter(
        (a) =>
          (!priceCheck || a.cost_purchase_cost == null || a.cost_purchase_cost === 0) &&
          (!inStockOnly || a.status === ASSET_STATUS.IN_STOCK),
      ),
    [assets, priceCheck, inStockOnly],
  )

  return (
    <AssetSearchPage
      title="On Hand"
      navContext="onhand"
      savedViewPageKey="search_onhand"
      assets={visibleAssets}
      isLoading={isLoading}
      onBulkPriceSave={handleBulkPriceSave}
      defaultSort={CREATED_AT_DESC_SORT}
      getRowClassName={heldRowClassName}
      forceVisibleColumnIds={priceCheck ? PRICE_CHECK_COLUMN_IDS : undefined}
    >
      <AssetFilterBar
        scopeFilters={
          <>
            <WarehouseFilter selection={warehouses} onSelectionChange={setWarehouses} />
            <Toggle
              variant="outline"
              pressed={inStockOnly}
              onPressedChange={setInStockOnly}
              aria-label="Show only in-stock assets"
            >
              {inStockOnly ? 'Show All' : 'Show In Stock'}
            </Toggle>
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
            <UserFilter
              selection={heldBy}
              onSelectionChange={setHeldBy}
              onClear={() => setHeldBy(null)}
              placeholder="Held By"
              clearLabel="Clear held by"
            />
            <UserFilter
              selection={heldFor}
              onSelectionChange={setHeldFor}
              onClear={() => setHeldFor(null)}
              placeholder="Held For"
              clearLabel="Clear held for"
            />
            <CustomerFilter
              selection={holdCustomer}
              onSelectionChange={setHoldCustomer}
              onClear={() => setHoldCustomer(null)}
            />
          </>
        }
      />
    </AssetSearchPage>
  )
}
