import { getAssetsForSearchHeld } from '@/data/api/asset-api'
import type { SearchHeldFilters } from '@/lib/search-held-params'
import type { AssetSearchRow } from 'shared-types'
import useSWR from 'swr'

const SEARCH_HELD_KEY = 'search-held-assets'

function hasWarehouse(f: SearchHeldFilters): boolean {
  return f.warehouses.length > 0
}

export function useSearchHeld(filters: SearchHeldFilters) {
  return useSWR<AssetSearchRow[]>(
    hasWarehouse(filters) ? [SEARCH_HELD_KEY, filters] : null,
    ([, f]: [string, SearchHeldFilters]) => getAssetsForSearchHeld(
      f.warehouses,
      f.brand,
      f.assetTypes,
      f.readinesses,
      f.model?.model_name ?? f.modelQuery,
      f.meterMin,
      f.meterMax,
      f.cassettes,
      f.internalFinisher,
      f.heldBy,
      f.heldFor,
      f.holdCustomer,
    ),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )
}
