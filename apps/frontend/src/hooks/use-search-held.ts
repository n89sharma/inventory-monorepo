import { getAssetsForSearchHeld } from '@/data/api/asset-api'
import { useActiveWarehouses } from '@/hooks/use-active-warehouses'
import { resolveWarehouseScope } from '@/lib/asset-filter-params'
import type { SearchHeldFilters } from '@/lib/search-held-params'
import type { AssetSearchRow } from 'shared-types'
import useSWR from 'swr'

const SEARCH_HELD_KEY = 'search-held-assets'

export function useSearchHeld(filters: SearchHeldFilters) {
  const activeWarehouses = useActiveWarehouses()
  const warehouses = resolveWarehouseScope(filters.warehouses, activeWarehouses)

  return useSWR<AssetSearchRow[]>(
    warehouses.length > 0 ? [SEARCH_HELD_KEY, { ...filters, warehouses }] : null,
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
      f.daysHeldMin,
    ),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )
}
