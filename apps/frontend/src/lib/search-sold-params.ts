import type { AssetType, Brand, Status } from 'shared-types'
import {
  decodeIds,
  DEFAULT_WAREHOUSE_CODE,
  encodeIds,
  getSharedFilters,
  setSharedFilterParams,
  type SharedAssetFilters,
  type SharedAssetReferenceData,
} from '@/lib/asset-filter-params'

const PARAM_BRAND = 'brand'
const PARAM_TYPE = 'type'
const PARAM_OTHER = 'other'
const PARAM_RANGE = 'range'
const OTHER_ON = '1'

export const SOLD_STATUS = 'SOLD'
export const HARVESTED_STATUS = 'HARVESTED'
export const SCRAPPED_STATUS = 'SCRAPPED'

export const SOLD_RANGE_MONTHS = [1, 6] as const
export type SoldRangeMonths = typeof SOLD_RANGE_MONTHS[number]
const DEFAULT_RANGE: SoldRangeMonths = 1

export type SearchSoldFilters = SharedAssetFilters & {
  brand: Brand | null
  assetTypes: AssetType[]
  showOther: boolean
  range: SoldRangeMonths
}

export type SearchSoldReferenceData = SharedAssetReferenceData & {
  brands: Brand[]
  assetTypes: AssetType[]
}

export function resolveSoldStatuses(showOther: boolean, allStatuses: Status[]): Status[] {
  const wanted = new Set(
    showOther ? [HARVESTED_STATUS, SCRAPPED_STATUS] : [SOLD_STATUS],
  )
  return allStatuses.filter(s => wanted.has(s.status))
}

export function filtersToParams(filters: SearchSoldFilters): URLSearchParams {
  const params = new URLSearchParams()
  setSharedFilterParams(params, filters)
  if (filters.brand) params.set(PARAM_BRAND, String(filters.brand.id))
  if (filters.assetTypes.length > 0) params.set(PARAM_TYPE, encodeIds(filters.assetTypes))
  if (filters.showOther) params.set(PARAM_OTHER, OTHER_ON)
  if (filters.range !== DEFAULT_RANGE) params.set(PARAM_RANGE, String(filters.range))
  return params
}

export function paramsToFilters(
  params: URLSearchParams,
  ref: SearchSoldReferenceData,
): SearchSoldFilters {
  const brandId = params.get(PARAM_BRAND)
  const brand = brandId
    ? ref.brands.find(b => b.id === Number.parseInt(brandId, 10)) ?? null
    : null

  const rangeRaw = Number.parseInt(params.get(PARAM_RANGE) ?? '', 10)
  const range = SOLD_RANGE_MONTHS.includes(rangeRaw as SoldRangeMonths)
    ? (rangeRaw as SoldRangeMonths)
    : DEFAULT_RANGE

  return {
    ...getSharedFilters(params, ref, DEFAULT_WAREHOUSE_CODE),
    brand,
    assetTypes: decodeIds(params.get(PARAM_TYPE), ref.assetTypes),
    showOther: params.get(PARAM_OTHER) === OTHER_ON,
    range,
  }
}
