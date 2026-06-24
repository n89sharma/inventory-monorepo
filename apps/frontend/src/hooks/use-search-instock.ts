import { getAssetsForSearchInStock } from '@/data/api/asset-api'
import { useActiveWarehouses } from '@/hooks/use-active-warehouses'
import { resolveWarehouseScope } from '@/lib/asset-filter-params'
import type { SearchInStockFilters } from '@/lib/search-instock-params'
import type { AssetSearchRow } from 'shared-types'
import useSWR from 'swr'

const SEARCH_INSTOCK_KEY = 'search-instock-assets'

export function useSearchInStock(filters: SearchInStockFilters) {
  const activeWarehouses = useActiveWarehouses()
  const warehouses = resolveWarehouseScope(filters.warehouses, activeWarehouses)

  return useSWR<AssetSearchRow[]>(
    warehouses.length > 0 ? [SEARCH_INSTOCK_KEY, { ...filters, warehouses }] : null,
    ([, f]: [string, SearchInStockFilters]) =>
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
