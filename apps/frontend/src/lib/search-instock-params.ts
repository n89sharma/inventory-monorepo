import type { AssetType, Brand, ModelSummary, Status, Warehouse } from 'shared-types'
import {
  decodeIds,
  encodeIds,
  getModelParams,
  parseNonNegativeNumber,
  setModelParams,
} from '@/lib/asset-filter-params'

const PARAM_WH = 'wh'
const PARAM_BRAND = 'brand'
const PARAM_TYPE = 'type'
const PARAM_READINESS = 'readiness'
const PARAM_METER_MIN = 'meter_min'
const PARAM_METER_MAX = 'meter_max'
const PARAM_HELD = 'held'
const HELD_ON = '1'

export const DEFAULT_WAREHOUSE_CODE = 'YYZ'

export type SearchInStockFilters = {
  warehouses: Warehouse[]
  brand: Brand | null
  assetTypes: AssetType[]
  model: ModelSummary | null
  modelQuery: string | null
  readinesses: Status[]
  meterMin: number | null
  meterMax: number | null
  includeHeld: boolean
}

export type SearchInStockReferenceData = {
  warehouses: Warehouse[]
  brands: Brand[]
  assetTypes: AssetType[]
  models: ModelSummary[]
  readinesses: Status[]
}

export function filtersToParams(filters: SearchInStockFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.warehouses.length > 0) {
    params.set(PARAM_WH, encodeIds(filters.warehouses))
  }
  if (filters.brand) params.set(PARAM_BRAND, String(filters.brand.id))
  if (filters.assetTypes.length > 0) params.set(PARAM_TYPE, encodeIds(filters.assetTypes))
  setModelParams(params, filters.model, filters.modelQuery)
  if (filters.readinesses.length > 0) params.set(PARAM_READINESS, encodeIds(filters.readinesses))
  if (filters.meterMin !== null) params.set(PARAM_METER_MIN, String(filters.meterMin))
  if (filters.meterMax !== null) params.set(PARAM_METER_MAX, String(filters.meterMax))
  if (filters.includeHeld) params.set(PARAM_HELD, HELD_ON)
  return params
}

export function paramsToFilters(
  params: URLSearchParams,
  ref: SearchInStockReferenceData,
): SearchInStockFilters {
  const whRaw = params.get(PARAM_WH)
  const defaultWarehouse = ref.warehouses.find(w => w.city_code === DEFAULT_WAREHOUSE_CODE)
  const warehouses = whRaw === null
    ? (defaultWarehouse ? [defaultWarehouse] : [])
    : decodeIds(whRaw, ref.warehouses)

  const { model, modelQuery } = getModelParams(params, ref.models)

  const brandId = params.get(PARAM_BRAND)
  const brand = brandId
    ? ref.brands.find(b => b.id === Number.parseInt(brandId, 10)) ?? null
    : null

  return {
    warehouses,
    brand,
    assetTypes: decodeIds(params.get(PARAM_TYPE), ref.assetTypes),
    model,
    modelQuery,
    readinesses: decodeIds(params.get(PARAM_READINESS), ref.readinesses),
    meterMin: parseNonNegativeNumber(params.get(PARAM_METER_MIN)),
    meterMax: parseNonNegativeNumber(params.get(PARAM_METER_MAX)),
    includeHeld: params.get(PARAM_HELD) === HELD_ON,
  }
}
