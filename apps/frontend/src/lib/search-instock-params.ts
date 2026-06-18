import type { AssetType, Brand } from 'shared-types'
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

export type SearchInStockFilters = SharedAssetFilters & {
  brand: Brand | null
  assetTypes: AssetType[]
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
  return params
}

export function paramsToFilters(
  params: URLSearchParams,
  ref: SearchInStockReferenceData,
): SearchInStockFilters {
  const brandId = params.get(PARAM_BRAND)
  const brand = brandId
    ? ref.brands.find(b => b.id === Number.parseInt(brandId, 10)) ?? null
    : null

  return {
    ...getSharedFilters(params, ref, DEFAULT_WAREHOUSE_CODE),
    brand,
    assetTypes: decodeIds(params.get(PARAM_TYPE), ref.assetTypes),
  }
}
