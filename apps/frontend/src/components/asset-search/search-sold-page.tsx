import { AssetSearchPage } from '@/components/asset-search/asset-search-page'
import { CustomerFilter } from '@/components/filters/customer-filter'
import { DepartedDateRangeFilter } from '@/components/filters/departed-date-range-filter'
import { Toggle } from '@/components/shadcn/toggle'
import { AssetFilterBar } from '@/components/shared/asset-filter-bar'
import { AssetIdentityFilters } from '@/components/shared/asset-identity-filters'
import { useSearchSold } from '@/hooks/use-search-sold'
import {
  useAssetTypesParam,
  useBrandParam,
  useCustomerParam,
  useDepartedRangeParam,
  useSharedAssetFilters,
  useShowOtherParam,
} from '@/lib/filters/hooks'
import { useCallback, useMemo } from 'react'
import type { AssetSearchRow } from 'shared-types'

const EMPTY_ASSETS: AssetSearchRow[] = []
const DEPARTED_AT_DESC_SORT = { id: 'departed_at', desc: true } as const

export function SearchSoldPage(): React.JSX.Element {
  const shared = useSharedAssetFilters()
  const [brand] = useBrandParam()
  const [assetTypes] = useAssetTypesParam()
  const [showOther, setShowOther] = useShowOtherParam()
  const { from, to, setRange } = useDepartedRangeParam()
  const [customer, setCustomer] = useCustomerParam()

  const filters = useMemo(
    () => ({ ...shared, brand, assetTypes, showOther, fromDate: from, toDate: to, customer }),
    [shared, brand, assetTypes, showOther, from, to, customer],
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
        scopeSlot={
          <>
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
        identitySlot={<AssetIdentityFilters />}
      />
    </AssetSearchPage>
  )
}
