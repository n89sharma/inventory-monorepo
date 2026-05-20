import { getAssetsForQuery } from '@/data/api/asset-api'
import { MIN_QUERY_LENGTH, type SearchFilters } from '@/lib/search-url-params'
import type { AssetSummary } from 'shared-types'
import useSWR from 'swr'

const SEARCH_KEY = 'search-assets'

function hasSearchTarget(f: SearchFilters): boolean {
  return f.model !== null
    || (f.modelQuery !== null && f.modelQuery.length >= MIN_QUERY_LENGTH)
}

export function useSearchResults(filters: SearchFilters) {
  return useSWR<AssetSummary[]>(
    hasSearchTarget(filters) ? [SEARCH_KEY, filters] : null,
    ([, f]: [string, SearchFilters]) => {
      const modelName = f.model?.model_name ?? f.modelQuery!
      return getAssetsForQuery(
        modelName,
        f.meter,
        f.availabilityStatuses,
        f.technicalStatuses,
        f.selectedWarehouses,
      )
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )
}
