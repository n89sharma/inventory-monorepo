import { getAssetsForSearchOnHand } from '@/data/api/asset-api'
import { useActiveWarehouses } from '@/hooks/use-active-warehouses'
import { resolveWarehouseScope, type AssetFilters } from '@/lib/filters/hooks'
import type { AssetSearchRow, OrgSummary, User, Warehouse } from 'shared-types'
import useSWR from 'swr'

export type SearchOnHandFilters = AssetFilters & {
  warehouses: Warehouse[]
  priceCheck: boolean
  heldBy: User | null
  heldFor: User | null
  holdCustomer: OrgSummary | null
}

const SEARCH_ONHAND_KEY = 'search-onhand-assets'

export function useSearchOnHand(filters: SearchOnHandFilters) {
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
    heldBy: filters.heldBy,
    heldFor: filters.heldFor,
    holdCustomer: filters.holdCustomer,
  }

  return useSWR<AssetSearchRow[]>(
    warehouses.length > 0 ? [SEARCH_ONHAND_KEY, queryFilters] : null,
    ([, f]: [string, typeof queryFilters]) =>
      getAssetsForSearchOnHand(
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
