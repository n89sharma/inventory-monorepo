import { getAssetsForSold } from '@/data/api/asset-api'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { resolveSoldStatuses, type SearchSoldFilters } from '@/lib/search-sold-params'
import { subMonths } from 'date-fns'
import type { AssetSearchRow } from 'shared-types'
import useSWR from 'swr'

const SEARCH_SOLD_KEY = 'search-sold-assets'

export function useSearchSold(filters: SearchSoldFilters) {
  const allStatuses = useReferenceDataStore(state => state.statuses)
  const statuses = resolveSoldStatuses(filters.showOther, allStatuses)
  const ready = filters.warehouses.length > 0 && statuses.length > 0

  return useSWR<AssetSearchRow[]>(
    ready ? [SEARCH_SOLD_KEY, filters] : null,
    ([, f]: [string, SearchSoldFilters]) => getAssetsForSold(
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
      subMonths(new Date(), f.range),
    ),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )
}
