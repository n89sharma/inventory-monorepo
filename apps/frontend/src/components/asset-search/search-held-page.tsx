import { AssetSearchPage } from '@/components/asset-search/asset-search-page'
import { CustomerFilter } from '@/components/shared/filters/customer-filter'
import { DaysHeldFilter } from '@/components/shared/filters/days-held-filter'
import { UserFilter } from '@/components/shared/filters/user-filter'
import { daysHeld } from '@/components/table-columns/asset-search-columns'
import { AssetFilterBar } from '@/components/shared/asset-filter-bar'
import { AssetIdentityFilters } from '@/components/shared/asset-identity-filters'
import { useSearchHeld } from '@/hooks/use-search-held'
import {
  useAssetTypesParam,
  useBrandParam,
  useDaysHeldParam,
  useHeldByParam,
  useHeldForParam,
  useHoldCustomerParam,
  useSharedAssetFilters,
} from '@/lib/filters/hooks'
import { useCallback, useMemo } from 'react'
import type { AssetSearchRow } from 'shared-types'

const EMPTY_ASSETS: AssetSearchRow[] = []
const DAYS_HELD_DESC_SORT = { id: 'days_held', desc: true } as const
const DAYS_HELD_WARNING_THRESHOLD = 30
const ROW_WARNING_CLASS = 'data-row-warning'

function heldRowClassName(asset: AssetSearchRow): string | undefined {
  const days = daysHeld(asset.hold_created_at)
  return days !== undefined && days > DAYS_HELD_WARNING_THRESHOLD ? ROW_WARNING_CLASS : undefined
}

function HeldScopeFilters(): React.JSX.Element {
  const [heldBy, setHeldBy] = useHeldByParam()
  const [heldFor, setHeldFor] = useHeldForParam()
  const [holdCustomer, setHoldCustomer] = useHoldCustomerParam()
  const [daysHeldMin, setDaysHeldMin] = useDaysHeldParam()
  return (
    <>
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
      <DaysHeldFilter value={daysHeldMin} onValueChange={setDaysHeldMin} />
    </>
  )
}

export function SearchHeldPage(): React.JSX.Element {
  const shared = useSharedAssetFilters()
  const [brand] = useBrandParam()
  const [assetTypes] = useAssetTypesParam()
  const [heldBy] = useHeldByParam()
  const [heldFor] = useHeldForParam()
  const [holdCustomer] = useHoldCustomerParam()
  const [daysHeldMin] = useDaysHeldParam()

  const filters = useMemo(
    () => ({ ...shared, brand, assetTypes, heldBy, heldFor, holdCustomer, daysHeldMin }),
    [shared, brand, assetTypes, heldBy, heldFor, holdCustomer, daysHeldMin],
  )

  const { data: assets = EMPTY_ASSETS, isLoading, mutate } = useSearchHeld(filters)
  const handleBulkPriceSave = useCallback(() => {
    mutate()
  }, [mutate])

  return (
    <AssetSearchPage
      title="Held"
      navContext="held"
      savedViewPageKey="search_held"
      assets={assets}
      isLoading={isLoading}
      onBulkPriceSave={handleBulkPriceSave}
      defaultSort={DAYS_HELD_DESC_SORT}
      getRowClassName={heldRowClassName}
    >
      <AssetFilterBar scopeSlot={<HeldScopeFilters />} identitySlot={<AssetIdentityFilters />} />
    </AssetSearchPage>
  )
}
