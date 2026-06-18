import { getAssetsForSearchInStock } from '@/data/api/asset-api'
import type { SearchInStockFilters } from '@/lib/search-instock-params'
import type { AssetSearchRow } from 'shared-types'
import useSWR from 'swr'

const SEARCH_INSTOCK_KEY = 'search-instock-assets'

function hasWarehouse(f: SearchInStockFilters): boolean {
  return f.warehouses.length > 0
}

export function useSearchInStock(filters: SearchInStockFilters) {
  return useSWR<AssetSearchRow[]>(
    hasWarehouse(filters) ? [SEARCH_INSTOCK_KEY, filters] : null,
    ([, f]: [string, SearchInStockFilters]) => getAssetsForSearchInStock(
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
