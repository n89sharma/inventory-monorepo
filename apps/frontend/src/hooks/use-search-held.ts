import { getAssetsForSearchHeld } from '@/data/api/asset-api'
import { useActiveWarehouses } from '@/hooks/use-active-warehouses'
import { resolveWarehouseScope, type SharedAssetFilters } from '@/lib/filters/hooks'
import type { AssetSearchRow, AssetType, Brand, OrgSummary, User } from 'shared-types'
import useSWR from 'swr'

export type SearchHeldFilters = SharedAssetFilters & {
  brand: Brand | null
  assetTypes: AssetType[]
  heldBy: User | null
  heldFor: User | null
  holdCustomer: OrgSummary | null
  daysHeldMin: number | null
}

const SEARCH_HELD_KEY = 'search-held-assets'

export function useSearchHeld(filters: SearchHeldFilters) {
  const activeWarehouses = useActiveWarehouses()
  const warehouses = resolveWarehouseScope(filters.warehouses, activeWarehouses)

  return useSWR<AssetSearchRow[]>(
    warehouses.length > 0 ? [SEARCH_HELD_KEY, { ...filters, warehouses }] : null,
    ([, f]: [string, SearchHeldFilters]) =>
      getAssetsForSearchHeld(
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
