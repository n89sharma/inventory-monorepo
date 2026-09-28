import {
  invalidateSearchAssetsByStatus,
  useSearchAssetsByStatus,
  type SearchAssetsByStatusFilters,
} from '@/hooks/use-search-assets-by-status'
import { ASSET_STATUS } from 'shared-types'

const SEARCH_MISSING_KEY = 'search-missing-assets'

export function useSearchMissing(filters: SearchAssetsByStatusFilters) {
  return useSearchAssetsByStatus(SEARCH_MISSING_KEY, ASSET_STATUS.MISSING, filters)
}

export function invalidateSearchMissing() {
  return invalidateSearchAssetsByStatus(SEARCH_MISSING_KEY)
}
