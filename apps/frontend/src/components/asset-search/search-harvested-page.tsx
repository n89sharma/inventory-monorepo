import { AssetSearchPage } from '@/components/asset-search/asset-search-page'
import { WarehouseFilter } from '@/components/shared/filters/warehouse-filter'
import { AssetFilterBar } from '@/components/asset-search/asset-filter-bar'
import { useSearchHarvested } from '@/hooks/use-search-harvested'
import { useAssetFilters, useWarehousesParam } from '@/lib/filters/hooks'
import { useCallback, useMemo } from 'react'
import type { AssetSearchRow } from 'shared-types'

const EMPTY_ASSETS: AssetSearchRow[] = []
const DEPARTED_AT_DESC_SORT = { id: 'departed_at', desc: true } as const

export function SearchHarvestedPage(): React.JSX.Element {
  const assetFilters = useAssetFilters()
  const [warehouses, setWarehouses] = useWarehousesParam()

  const filters = useMemo(() => ({ ...assetFilters, warehouses }), [assetFilters, warehouses])

  // Held as one element so a URL write that touches none of these filters, such as sorting
  // the grid, re-renders neither the control nor the popover it owns.
  const scopeFilters = useMemo(
    () => <WarehouseFilter selection={warehouses} onSelectionChange={setWarehouses} />,
    [warehouses, setWarehouses],
  )

  const { data: assets = EMPTY_ASSETS, isLoading, mutate } = useSearchHarvested(filters)
  const handleBulkPriceSave = useCallback(() => {
    mutate()
  }, [mutate])

  return (
    <AssetSearchPage
      title="Harvested"
      navContext="harvested"
      savedViewPageKey="search_harvested"
      assets={assets}
      isLoading={isLoading}
      onBulkPriceSave={handleBulkPriceSave}
      defaultSort={DEPARTED_AT_DESC_SORT}
    >
      <AssetFilterBar scopeFilters={scopeFilters} />
    </AssetSearchPage>
  )
}
