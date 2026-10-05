import { AssetSearchPage } from '@/components/asset-search/asset-search-page'
import { ReturnMissingToStockDialog } from '@/components/asset-missing/return-missing-to-stock-dialog'
import type { RenderBulkExtraActions } from '@/components/collections/bulk-edit-bar'
import { WarehouseFilter } from '@/components/shared/filters/warehouse-filter'
import { AssetFilterBar } from '@/components/asset-search/asset-filter-bar'
import { useCan } from '@/hooks/use-can'
import { useSearchMissing } from '@/hooks/use-search-missing'
import { useAssetFilters, useWarehousesParam } from '@/lib/filters/hooks'
import { useCallback, useMemo, useState } from 'react'
import type { AssetSearchRow } from 'shared-types'

const EMPTY_ASSETS: AssetSearchRow[] = []
const RETURN_TO_STOCK_LABEL = 'Return to stock'

export function SearchMissingPage(): React.JSX.Element {
  const assetFilters = useAssetFilters()
  const [warehouses, setWarehouses] = useWarehousesParam()

  const filters = useMemo(() => ({ ...assetFilters, warehouses }), [assetFilters, warehouses])

  const scopeFilters = useMemo(
    () => <WarehouseFilter selection={warehouses} onSelectionChange={setWarehouses} />,
    [warehouses, setWarehouses],
  )

  const { data: assets = EMPTY_ASSETS, isLoading, mutate } = useSearchMissing(filters)
  const handleBulkPriceSave = useCallback(() => {
    mutate()
  }, [mutate])

  const canResolveMissing = useCan('update_asset_status')
  const [returnToStockOpen, setReturnToStockOpen] = useState(false)

  const renderBulkExtraActions = useCallback<RenderBulkExtraActions>(
    ({ selectedAssets, clearSelection }) => {
      if (!canResolveMissing) return null
      return {
        groups: [
          {
            actions: [{ label: RETURN_TO_STOCK_LABEL, onSelect: () => setReturnToStockOpen(true) }],
          },
        ],
        dialogs: (
          <ReturnMissingToStockDialog
            assets={selectedAssets}
            open={returnToStockOpen}
            onOpenChange={setReturnToStockOpen}
            onSuccess={clearSelection}
          />
        ),
      }
    },
    [canResolveMissing, returnToStockOpen],
  )

  return (
    <AssetSearchPage
      title="Missing"
      navContext="missing"
      savedViewPageKey="search_missing"
      assets={assets}
      isLoading={isLoading}
      onBulkPriceSave={handleBulkPriceSave}
      renderBulkExtraActions={renderBulkExtraActions}
    >
      <AssetFilterBar scopeFilters={scopeFilters} />
    </AssetSearchPage>
  )
}
