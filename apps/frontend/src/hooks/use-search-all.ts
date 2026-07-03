import { getAssetsForSearchAll } from '@/data/api/asset-api'
import { useActiveWarehouses } from '@/hooks/use-active-warehouses'
import {
  MIN_MODEL_INPUT_QUERY_LENGTH,
  resolveWarehouseScope,
  type AssetFilters,
} from '@/lib/filters/hooks'
import type { AssetSearchRow, Status, Warehouse } from 'shared-types'
import useSWR from 'swr'

export type SearchAllFilters = AssetFilters & {
  warehouses: Warehouse[]
  statuses: Status[]
}

const SEARCH_ALL_KEY = 'search-all-assets'

function hasSearchTarget(f: SearchAllFilters): boolean {
  return (
    f.model !== null ||
    (f.modelQuery !== null && f.modelQuery.length >= MIN_MODEL_INPUT_QUERY_LENGTH)
  )
}

export function useSearchAll(filters: SearchAllFilters) {
  const activeWarehouses = useActiveWarehouses()
  const warehouses = resolveWarehouseScope(filters.warehouses, activeWarehouses)

  return useSWR<AssetSearchRow[]>(
    hasSearchTarget(filters) ? [SEARCH_ALL_KEY, { ...filters, warehouses }] : null,
    ([, f]: [string, SearchAllFilters]) => {
      const modelName = f.model?.model_name ?? f.modelQuery!
      return getAssetsForSearchAll(
        modelName,
        f.meterMin,
        f.meterMax,
        f.cassettes,
        f.internalFinisher,
        f.statuses,
        f.readinesses,
        f.warehouses,
      )
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )
}
