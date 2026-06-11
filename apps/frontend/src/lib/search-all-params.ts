import type { Status } from 'shared-types'
import {
  decodeIds,
  encodeIds,
  EMPTY_SHARED_FILTERS,
  getSharedFilters,
  setSharedFilterParams,
  type SharedAssetFilters,
  type SharedAssetReferenceData,
} from '@/lib/asset-filter-params'

const PARAM_STATUS = 'status'

export type SearchAllFilters = SharedAssetFilters & {
  statuses: Status[]
}

export type SearchAllReferenceData = SharedAssetReferenceData & {
  statuses: Status[]
}

export const EMPTY_SEARCH_ALL_FILTERS: SearchAllFilters = {
  ...EMPTY_SHARED_FILTERS,
  statuses: [],
}

export function filtersToParams(filters: SearchAllFilters): URLSearchParams {
  const params = new URLSearchParams()
  setSharedFilterParams(params, filters)
  if (filters.statuses.length > 0) {
    params.set(PARAM_STATUS, encodeIds(filters.statuses))
  }
  return params
}

export function paramsToFilters(
  params: URLSearchParams,
  ref: SearchAllReferenceData,
): SearchAllFilters {
  return {
    ...getSharedFilters(params, ref),
    statuses: decodeIds(params.get(PARAM_STATUS), ref.statuses),
  }
}
