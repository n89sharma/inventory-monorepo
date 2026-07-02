import { getAssetsForSold } from '@/data/api/asset-api'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useActiveWarehouses } from '@/hooks/use-active-warehouses'
import {
  isValidSoldDateRange,
  resolveSoldStatuses,
  resolveWarehouseScope,
  type SharedAssetFilters,
} from '@/lib/filters/hooks'
import type { AssetSearchRow, AssetType, Brand, OrgSummary } from 'shared-types'
import useSWR from 'swr'

export type SearchSoldFilters = SharedAssetFilters & {
  brand: Brand | null
  assetTypes: AssetType[]
  showOther: boolean
  fromDate: Date
  toDate: Date
  customer: OrgSummary | null
}

const SEARCH_SOLD_KEY = 'search-sold-assets'

export function useSearchSold(filters: SearchSoldFilters) {
  const allStatuses = useReferenceDataStore((state) => state.statuses)
  const statuses = resolveSoldStatuses(filters.showOther, allStatuses)
  const activeWarehouses = useActiveWarehouses()
  const warehouses = resolveWarehouseScope(filters.warehouses, activeWarehouses)
  const ready =
    warehouses.length > 0 &&
    statuses.length > 0 &&
    isValidSoldDateRange(filters.fromDate, filters.toDate)

  return useSWR<AssetSearchRow[]>(
    ready ? [SEARCH_SOLD_KEY, { ...filters, warehouses }] : null,
    ([, f]: [string, SearchSoldFilters]) =>
      getAssetsForSold(
        f.warehouses,
        f.brand,
        f.assetTypes,
        f.readinesses,
        f.model?.model_name ?? f.modelQuery,
        f.meterMin,
        f.meterMax,
        f.cassettes,
        f.internalFinisher,
        f.customer,
        statuses,
        f.fromDate,
        f.toDate,
      ),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )
}
