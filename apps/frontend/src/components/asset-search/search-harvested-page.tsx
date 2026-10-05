import { AssetSearchPage } from '@/components/asset-search/asset-search-page'
import { ReturnHarvestedToStockDialog } from '@/components/asset-harvest/harvest-dialogs'
import type { RenderBulkExtraActions } from '@/components/collections/bulk-edit-bar'
import { WarehouseFilter } from '@/components/shared/filters/warehouse-filter'
import { AssetFilterBar } from '@/components/asset-search/asset-filter-bar'
import { useCan } from '@/hooks/use-can'
import { useSearchHarvested } from '@/hooks/use-search-harvested'
import { isUnharvestable } from '@/lib/asset-status'
import { useAssetFilters, useWarehousesParam } from '@/lib/filters/hooks'
import { useCallback, useMemo, useState } from 'react'
import type { AssetSearchRow } from 'shared-types'

const EMPTY_ASSETS: AssetSearchRow[] = []
const RETURN_TO_STOCK_LABEL = 'Return to stock'

function returnToStockBlockedReason(assets: AssetSearchRow[]): string | undefined {
  const blockedCount = assets.filter((a) => !isUnharvestable(a.status, a.departure_number)).length
  if (blockedCount === 0) return undefined
  if (blockedCount === 1) return '1 selected asset is on a departure'
  return `${blockedCount} selected assets are on a departure`
}

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

  const canHarvest = useCan('update_asset_status')
  const [returnToStockOpen, setReturnToStockOpen] = useState(false)

  const renderBulkExtraActions = useCallback<RenderBulkExtraActions>(
    ({ selectedAssets, clearSelection }) => {
      if (!canHarvest) return null
      return {
        groups: [
          {
            actions: [
              {
                label: RETURN_TO_STOCK_LABEL,
                onSelect: () => setReturnToStockOpen(true),
                blockedReason: returnToStockBlockedReason(selectedAssets),
              },
            ],
          },
        ],
        dialogs: (
          <ReturnHarvestedToStockDialog
            assets={selectedAssets}
            open={returnToStockOpen}
            onOpenChange={setReturnToStockOpen}
            onSuccess={clearSelection}
          />
        ),
      }
    },
    [canHarvest, returnToStockOpen],
  )

  return (
    <AssetSearchPage
      title="Harvested"
      navContext="harvested"
      savedViewPageKey="search_harvested"
      assets={assets}
      isLoading={isLoading}
      onBulkPriceSave={handleBulkPriceSave}
      renderBulkExtraActions={renderBulkExtraActions}
    >
      <AssetFilterBar scopeFilters={scopeFilters} />
    </AssetSearchPage>
  )
}
