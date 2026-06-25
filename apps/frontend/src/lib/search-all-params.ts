import {
  decodeIds,
  encodeIds,
  getSharedFilters,
  setSharedFilterParams,
  type SharedAssetFilters,
  type SharedAssetReferenceData,
} from '@/lib/asset-filter-params'
import type { Status } from 'shared-types'

const PARAM_STATUS = 'status'

export type SearchAllFilters = SharedAssetFilters & {
  statuses: Status[]
}

export type SearchAllReferenceData = SharedAssetReferenceData & {
  statuses: Status[]
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
