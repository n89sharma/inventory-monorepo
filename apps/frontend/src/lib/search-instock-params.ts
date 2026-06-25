import type { AssetType, Brand } from 'shared-types'
import {
  decodeIds,
  encodeIds,
  getSharedFilters,
  setSharedFilterParams,
  type SharedAssetFilters,
  type SharedAssetReferenceData,
} from '@/lib/asset-filter-params'

export const PARAM_BRAND = 'brand'
export const PARAM_TYPE = 'type'
const PARAM_PRICE_CHECK = 'pricecheck'
const PRICE_CHECK_ON = '1'

export type SearchInStockFilters = SharedAssetFilters & {
  brand: Brand | null
  assetTypes: AssetType[]
  priceCheck: boolean
}

export type SearchInStockReferenceData = SharedAssetReferenceData & {
  brands: Brand[]
  assetTypes: AssetType[]
}

export function filtersToParams(filters: SearchInStockFilters): URLSearchParams {
  const params = new URLSearchParams()
  setSharedFilterParams(params, filters)
  if (filters.brand) params.set(PARAM_BRAND, String(filters.brand.id))
  if (filters.assetTypes.length > 0) params.set(PARAM_TYPE, encodeIds(filters.assetTypes))
  if (filters.priceCheck) params.set(PARAM_PRICE_CHECK, PRICE_CHECK_ON)
  return params
}

export function paramsToFilters(
  params: URLSearchParams,
  ref: SearchInStockReferenceData,
): SearchInStockFilters {
  const brandId = params.get(PARAM_BRAND)
  const brand = brandId
    ? (ref.brands.find((b) => b.id === Number.parseInt(brandId, 10)) ?? null)
    : null

  return {
    ...getSharedFilters(params, ref),
    brand,
    assetTypes: decodeIds(params.get(PARAM_TYPE), ref.assetTypes),
    priceCheck: params.get(PARAM_PRICE_CHECK) === PRICE_CHECK_ON,
  }
}
