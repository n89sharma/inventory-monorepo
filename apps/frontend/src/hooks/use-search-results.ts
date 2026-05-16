import { getAssetsForQuery } from '@/data/api/asset-api'
import type { SearchFilters } from '@/lib/search-url-params'
import type { AssetSummary } from 'shared-types'
import useSWR from 'swr'

const SEARCH_KEY = 'search-assets'

export function useSearchResults(filters: SearchFilters) {
  return useSWR<AssetSummary[]>(
    filters.model ? [SEARCH_KEY, filters] : null,
    ([, f]: [string, SearchFilters]) => getAssetsForQuery(
      f.model!,
      f.meter,
      f.availabilityStatuses,
      f.technicalStatuses,
      f.selectedWarehouses,
    ),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )
}
