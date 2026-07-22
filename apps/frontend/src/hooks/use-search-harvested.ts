import { getAssetsForHarvested } from '@/data/api/asset-api'
import { useActiveWarehouses } from '@/hooks/use-active-warehouses'
import {
  resolveHarvestedStatuses,
  resolveWarehouseScope,
  type AssetFilters,
} from '@/lib/filters/hooks'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import type { AssetSearchRow, Warehouse } from 'shared-types'
import useSWR from 'swr'

export type SearchHarvestedFilters = AssetFilters & {
  warehouses: Warehouse[]
}

const SEARCH_HARVESTED_KEY = 'search-harvested-assets'

export function useSearchHarvested(filters: SearchHarvestedFilters) {
  const activeWarehouses = useActiveWarehouses()
  const allStatuses = useReferenceDataStore((state) => state.statuses)
  const warehouses = resolveWarehouseScope(filters.warehouses, activeWarehouses)
  const statuses = resolveHarvestedStatuses(allStatuses)

  const queryFilters = {
    warehouses,
    statuses,
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
    warehouses.length > 0 && statuses.length > 0 ? [SEARCH_HARVESTED_KEY, queryFilters] : null,
    ([, f]: [string, typeof queryFilters]) =>
      getAssetsForHarvested(
        f.warehouses,
        f.brand,
        f.assetTypes,
        f.readinesses,
        f.model?.model_name ?? f.modelQuery,
        f.meterMin,
        f.meterMax,
        f.cassettes,
        f.internalFinisher,
        f.statuses,
      ),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )
}
