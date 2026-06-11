import { getAssetsForSearchAll } from '@/data/api/asset-api'
import { MIN_MODEL_INPUT_QUERY_LENGTH } from '@/lib/asset-filter-params'
import type { SearchAllFilters } from '@/lib/search-all-params'
import type { AssetSearchRow } from 'shared-types'
import useSWR from 'swr'

const SEARCH_ALL_KEY = 'search-all-assets'

function hasSearchTarget(f: SearchAllFilters): boolean {
  return f.model !== null
    || (f.modelQuery !== null && f.modelQuery.length >= MIN_MODEL_INPUT_QUERY_LENGTH)
}

export function useSearchAll(filters: SearchAllFilters) {
  return useSWR<AssetSearchRow[]>(
    hasSearchTarget(filters) ? [SEARCH_ALL_KEY, filters] : null,
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
        f.selectedWarehouses,
      )
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )
}
