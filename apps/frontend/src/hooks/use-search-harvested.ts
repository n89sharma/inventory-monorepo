import {
  invalidateSearchAssetsByStatus,
  useSearchAssetsByStatus,
  type SearchAssetsByStatusFilters,
} from '@/hooks/use-search-assets-by-status'
import { ASSET_STATUS } from 'shared-types'

const SEARCH_HARVESTED_KEY = 'search-harvested-assets'

export function useSearchHarvested(filters: SearchAssetsByStatusFilters) {
  return useSearchAssetsByStatus(SEARCH_HARVESTED_KEY, ASSET_STATUS.HARVESTED, filters)
}

export function invalidateSearchHarvested() {
  return invalidateSearchAssetsByStatus(SEARCH_HARVESTED_KEY)
}
