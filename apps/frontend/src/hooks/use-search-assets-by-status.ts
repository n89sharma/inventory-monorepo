import { getAssetsByStatus } from '@/data/api/asset-api'
import { useActiveWarehouses } from '@/hooks/use-active-warehouses'
import {
  resolveStatusesByName,
  resolveWarehouseScope,
  type AssetFilters,
} from '@/lib/filters/hooks'
import { useStatuses } from '@/hooks/use-reference-data'
import type { AssetSearchRow, AssetStatus, Warehouse } from 'shared-types'
import useSWR, { mutate } from 'swr'

export type SearchAssetsByStatusFilters = AssetFilters & {
  warehouses: Warehouse[]
}

export function useSearchAssetsByStatus(
  cacheKey: string,
  status: AssetStatus,
  filters: SearchAssetsByStatusFilters,
) {
  const activeWarehouses = useActiveWarehouses()
  const allStatuses = useStatuses()
  const warehouses = resolveWarehouseScope(filters.warehouses, activeWarehouses)
  const statuses = resolveStatusesByName(allStatuses, status)

  const queryFilters = {
    warehouses,
    statuses,
    brand: filters.brand,
    assetTypes: filters.assetTypes,
    readinesses: filters.readinesses,
    models: filters.models,
    modelQuery: filters.modelQuery,
    meterMin: filters.meterMin,
    meterMax: filters.meterMax,
    cassettes: filters.cassettes,
    internalFinisher: filters.internalFinisher,
  }

  return useSWR<AssetSearchRow[]>(
    warehouses.length > 0 && statuses.length > 0 ? [cacheKey, queryFilters] : null,
    ([, f]: [string, typeof queryFilters]) =>
      getAssetsByStatus(
        f.warehouses,
        f.brand,
        f.assetTypes,
        f.readinesses,
        f.modelQuery,
        f.models,
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

export function invalidateSearchAssetsByStatus(cacheKey: string) {
  return mutate((key) => Array.isArray(key) && key[0] === cacheKey, undefined, {
    revalidate: true,
  })
}
