import { FILTER_PARSERS } from '@/lib/filters/parsers'
import { METER_BANDS } from '@/lib/model-sales-summary'
import { createSerializer } from 'nuqs'
import type { AssetType, Brand, InStockSummaryRow, MeterBand, Warehouse } from 'shared-types'

const STORE_LIST_PATH = '/store'
const IN_STOCK_SUMMARY_PATH = '/reports/in-stock-summary'
const ONHAND_PATH = '/search/onhand'
const SOLD_REPORT_PATH = '/reports/sold-report'
const PROFITABILITY_REPORT_PATH = '/reports/profitability'

const BAND_BOUNDS = {
  LOW: METER_BANDS[0],
  MEDIUM: METER_BANDS[1],
  HIGH: METER_BANDS[2],
} as const satisfies Record<
  Exclude<MeterBand, 'UNKNOWN'>,
  { min: number | null; max: number | null }
>

const serializeWarehouse = createSerializer({ warehouse: FILTER_PARSERS.warehouse })
const serializeWh = createSerializer({ wh: FILTER_PARSERS.wh })
const serializeAssetSearch = createSerializer({ wh: FILTER_PARSERS.wh, type: FILTER_PARSERS.type })
const serializeInStockSummary = createSerializer({
  wh: FILTER_PARSERS.wh,
  brand: FILTER_PARSERS.brand,
  type: FILTER_PARSERS.type,
})
const serializeDrilldown = createSerializer({
  wh: FILTER_PARSERS.wh,
  brand: FILTER_PARSERS.brand,
  type: FILTER_PARSERS.type,
  model: FILTER_PARSERS.model,
  meter_min: FILTER_PARSERS.meter_min,
  meter_max: FILTER_PARSERS.meter_max,
})
const serializeModel = createSerializer({ model: FILTER_PARSERS.model })
const serializeHeld = createSerializer({
  heldfor: FILTER_PARSERS.heldfor,
  holdcustomer: FILTER_PARSERS.holdcustomer,
})

export function buildStoreListPath(warehouse: Warehouse | null): string {
  return buildStorePartsPathByWarehouseId(warehouse?.id ?? null)
}

export function buildStorePartsPathByWarehouseId(warehouseId: number | null): string {
  return serializeWarehouse(STORE_LIST_PATH, {
    warehouse: warehouseId === null ? null : [warehouseId],
  })
}

export function buildStorePartPath(partNumber: string, warehouseId: number): string {
  return serializeWarehouse(`${STORE_LIST_PATH}/${partNumber}`, { warehouse: [warehouseId] })
}

export function buildInStockSummaryPath(
  warehouse: Warehouse | null,
  brand: Brand | null,
  assetType: AssetType | null,
): string {
  return serializeInStockSummary(IN_STOCK_SUMMARY_PATH, {
    wh: warehouse ? [warehouse.id] : null,
    brand: brand?.id ?? null,
    type: assetType ? [assetType.id] : null,
  })
}

export function inStockDrilldownHref(row: InStockSummaryRow): string {
  const bounds = row.meter_band === 'UNKNOWN' ? null : BAND_BOUNDS[row.meter_band]
  return serializeDrilldown(ONHAND_PATH, {
    wh: [row.warehouse_id],
    brand: row.brand_id,
    type: [row.asset_type_id],
    model: row.model_id,
    meter_min: bounds?.min ?? null,
    meter_max: bounds?.max ?? null,
  })
}

export function soldReportHref(modelId: number): string {
  return serializeModel(SOLD_REPORT_PATH, { model: modelId })
}

export function buildOnHandModelPath(modelId: number): string {
  return serializeModel(ONHAND_PATH, { model: modelId })
}

export function buildSearchOnHandUrl(selection: {
  heldForId?: number
  holdCustomerId?: number
}): string {
  return serializeHeld(ONHAND_PATH, {
    heldfor: selection.heldForId ?? null,
    holdcustomer: selection.holdCustomerId ?? null,
  })
}

export function buildProfitabilityReportPath(warehouse: Warehouse | null): string {
  return serializeWh(PROFITABILITY_REPORT_PATH, { wh: warehouse ? [warehouse.id] : null })
}

export function buildAssetSearchPath(
  path: string,
  warehouse: Warehouse | null,
  assetType: AssetType | null,
): string {
  return serializeAssetSearch(path, {
    wh: warehouse ? [warehouse.id] : null,
    type: assetType ? [assetType.id] : null,
  })
}
