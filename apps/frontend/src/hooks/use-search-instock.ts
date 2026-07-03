import { getAssetsForSearchInStock } from '@/data/api/asset-api'
import { useActiveWarehouses } from '@/hooks/use-active-warehouses'
import { resolveWarehouseScope, type AssetFilters } from '@/lib/filters/hooks'
import type { AssetSearchRow, Warehouse } from 'shared-types'
import useSWR from 'swr'

export type SearchInStockFilters = AssetFilters & {
  warehouses: Warehouse[]
  priceCheck: boolean
}

const SEARCH_INSTOCK_KEY = 'search-instock-assets'

export function useSearchInStock(filters: SearchInStockFilters) {
  const activeWarehouses = useActiveWarehouses()
  const warehouses = resolveWarehouseScope(filters.warehouses, activeWarehouses)

  const queryFilters = {
    warehouses,
    brand: filters.brand,
    assetTypes: filters.assetTypes,
    readinesses: filters.readinesses,
    model: filters.model,
    modelQuery: filters.modelQuery,
    meterMin: filters.meterMin,
    meterMax: filters.meterMax,
    cassettes: filters.cassettes,
    internalFinisher: filters.internalFinisher,
  }

  return useSWR<AssetSearchRow[]>(
    warehouses.length > 0 ? [SEARCH_INSTOCK_KEY, queryFilters] : null,
    ([, f]: [string, typeof queryFilters]) =>
      getAssetsForSearchInStock(
        f.warehouses,
        f.brand,
        f.assetTypes,
        f.readinesses,
        f.model?.model_name ?? f.modelQuery,
        f.meterMin,
        f.meterMax,
        f.cassettes,
        f.internalFinisher,
      ),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )
}
