import { getAssetsForQuery } from '@/data/api/asset-api'
import { MIN_MODEL_INPUT_QUERY_LENGTH, type SearchFilters } from '@/lib/search-url-params'
import type { AssetSearchRow } from 'shared-types'
import useSWR from 'swr'

const SEARCH_KEY = 'search-assets'

function hasSearchTarget(f: SearchFilters): boolean {
  return f.model !== null
    || (f.modelQuery !== null && f.modelQuery.length >= MIN_MODEL_INPUT_QUERY_LENGTH)
}

export function useSearchResults(filters: SearchFilters) {
  return useSWR<AssetSearchRow[]>(
    hasSearchTarget(filters) ? [SEARCH_KEY, filters] : null,
    ([, f]: [string, SearchFilters]) => {
      const modelName = f.model?.model_name ?? f.modelQuery!
      return getAssetsForQuery(
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
