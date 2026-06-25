import type { AssetType, Brand, InStockSummaryRow, MeterBand, Warehouse } from 'shared-types'
import {
  decodeIds,
  encodeIds,
  PARAM_METER_MAX,
  PARAM_METER_MIN,
  PARAM_MODEL,
  PARAM_WH,
} from '@/lib/asset-filter-params'
import { METER_BANDS } from '@/lib/model-sales-summary'
import { PARAM_BRAND, PARAM_TYPE } from '@/lib/search-instock-params'

const IN_STOCK_SUMMARY_PATH = '/reports/in-stock-summary'
const INSTOCK_PATH = '/search/instock'
const SOLD_REPORT_PATH = '/reports/sold-report'

const BAND_BOUNDS = {
  LOW: METER_BANDS[0],
  MEDIUM: METER_BANDS[1],
  HIGH: METER_BANDS[2],
} as const satisfies Record<
  Exclude<MeterBand, 'UNKNOWN'>,
  { min: number | null; max: number | null }
>

export type InStockSummaryFilters = {
  warehouses: Warehouse[]
  brand: Brand | null
  assetTypes: AssetType[]
}

export type InStockSummaryReferenceData = {
  warehouses: Warehouse[]
  brands: Brand[]
  assetTypes: AssetType[]
}

export function filtersToParams(filters: InStockSummaryFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.warehouses.length > 0) params.set(PARAM_WH, encodeIds(filters.warehouses))
  if (filters.brand) params.set(PARAM_BRAND, String(filters.brand.id))
  if (filters.assetTypes.length > 0) params.set(PARAM_TYPE, encodeIds(filters.assetTypes))
  return params
}

export function paramsToFilters(
  params: URLSearchParams,
  ref: InStockSummaryReferenceData,
): InStockSummaryFilters {
  const brandId = params.get(PARAM_BRAND)
  const brand = brandId
    ? (ref.brands.find((b) => b.id === Number.parseInt(brandId, 10)) ?? null)
    : null

  return {
    warehouses: decodeIds(params.get(PARAM_WH), ref.warehouses),
    brand,
    assetTypes: decodeIds(params.get(PARAM_TYPE), ref.assetTypes),
  }
}

export function buildInStockSummaryPath(
  warehouse: Warehouse | null,
  brand: Brand | null,
  assetType: AssetType | null,
): string {
  const params = filtersToParams({
    warehouses: warehouse ? [warehouse] : [],
    brand,
    assetTypes: assetType ? [assetType] : [],
  })
  const query = params.toString()
  return query ? `${IN_STOCK_SUMMARY_PATH}?${query}` : IN_STOCK_SUMMARY_PATH
}

export function inStockDrilldownHref(row: InStockSummaryRow): string {
  const params = new URLSearchParams()
  params.set(PARAM_WH, String(row.warehouse_id))
  params.set(PARAM_BRAND, String(row.brand_id))
  params.set(PARAM_TYPE, String(row.asset_type_id))
  params.set(PARAM_MODEL, String(row.model_id))
  if (row.meter_band !== 'UNKNOWN') {
    const bounds = BAND_BOUNDS[row.meter_band]
    if (bounds.min !== null) params.set(PARAM_METER_MIN, String(bounds.min))
    if (bounds.max !== null) params.set(PARAM_METER_MAX, String(bounds.max))
  }
  return `${INSTOCK_PATH}?${params.toString()}`
}

export function soldReportHref(modelId: number): string {
  const params = new URLSearchParams()
  params.set(PARAM_MODEL, String(modelId))
  return `${SOLD_REPORT_PATH}?${params.toString()}`
}
