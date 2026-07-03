import { AssetSearchPage } from '@/components/asset-search/asset-search-page'
import { CustomerFilter } from '@/components/shared/filters/customer-filter'
import { DepartedDateRangeFilter } from '@/components/shared/filters/departed-date-range-filter'
import { WarehouseFilter } from '@/components/shared/filters/warehouse-filter'
import { Toggle } from '@/components/shadcn/toggle'
import { AssetFilterBar } from '@/components/asset-search/asset-filter-bar'
import { useSearchSold } from '@/hooks/use-search-sold'
import {
  useAssetFilters,
  useCustomerParam,
  useDepartedRangeParam,
  useShowOtherParam,
  useWarehousesParam,
} from '@/lib/filters/hooks'
import { useCallback, useMemo } from 'react'
import type { AssetSearchRow } from 'shared-types'

const EMPTY_ASSETS: AssetSearchRow[] = []
const DEPARTED_AT_DESC_SORT = { id: 'departed_at', desc: true } as const

export function SearchSoldPage(): React.JSX.Element {
  const assetFilters = useAssetFilters()
  const [warehouses, setWarehouses] = useWarehousesParam()
  const [showOther, setShowOther] = useShowOtherParam()
  const { from, to, setRange } = useDepartedRangeParam()
  const [customer, setCustomer] = useCustomerParam()

  const filters = useMemo(
    () => ({ ...assetFilters, warehouses, showOther, fromDate: from, toDate: to, customer }),
    [assetFilters, warehouses, showOther, from, to, customer],
  )

  const { data: assets = EMPTY_ASSETS, isLoading, mutate } = useSearchSold(filters)
  const handleBulkPriceSave = useCallback(() => {
    mutate()
  }, [mutate])

  return (
    <AssetSearchPage
      title="Sold"
      navContext="sold"
      savedViewPageKey="search_sold"
      assets={assets}
      isLoading={isLoading}
      onBulkPriceSave={handleBulkPriceSave}
      defaultSort={DEPARTED_AT_DESC_SORT}
    >
      <AssetFilterBar
        scopeFilters={
          <>
            <WarehouseFilter selection={warehouses} onSelectionChange={setWarehouses} />
            <Toggle
              variant="outline"
              pressed={showOther}
              onPressedChange={setShowOther}
              aria-label="Show harvested and scrapped assets"
            >
              {showOther ? 'Show Sold' : 'Show Harvested/Scrapped'}
            </Toggle>
            <DepartedDateRangeFilter from={from} to={to} onChange={setRange} />
            <CustomerFilter
              selection={customer}
              onSelectionChange={setCustomer}
              onClear={() => setCustomer(null)}
            />
          </>
        }
      />
    </AssetSearchPage>
  )
}
