import type { AssetColumnId } from '@/components/table-columns/asset-search-columns'
import {
  DEFAULT_COLLECTION_RANGE_DAYS,
  DEFAULT_DEPARTED_RANGE_DAYS,
  getDefaultFromDate,
  getToday,
  getDefaultYear,
} from '@/lib/filters/defaults'
import { FILTER_PARSERS } from '@/lib/filters/parsers'
import { METER_BANDS } from '@/lib/model-price-history-summary'
import { createSerializer } from 'nuqs'
import type { AssetType, Brand, InStockSummaryRow, MeterBand, Warehouse } from 'shared-types'

const HELD_DRILLDOWN_COLUMN_IDS = [
  'serial_number',
  'status',
  'held_by',
  'hold_created_for',
  'hold_customer',
  'hold_created_at',
  'days_held',
] as const satisfies readonly AssetColumnId[]

const HELD_DRILLDOWN_SORT = { id: 'days_held', desc: true } as const

const STORE_LIST_PATH = '/store'
const IN_STOCK_SUMMARY_PATH = '/reports/in-stock-summary'
const ONHAND_PATH = '/search/onhand'
const DEPARTED_PATH = '/search/departed'
export const MODEL_PRICE_HISTORY_PATH = '/reports/model-price-history'
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
const serializeDeparted = createSerializer({
  wh: FILTER_PARSERS.wh,
  from: FILTER_PARSERS.from,
  to: FILTER_PARSERS.to,
  brand: FILTER_PARSERS.brand,
})
const serializeDepartedSearch = createSerializer({
  wh: FILTER_PARSERS.wh,
  type: FILTER_PARSERS.type,
  from: FILTER_PARSERS.from,
  to: FILTER_PARSERS.to,
})
const serializeDateRange = createSerializer({ from: FILTER_PARSERS.from, to: FILTER_PARSERS.to })
const serializeProfitability = createSerializer({
  wh: FILTER_PARSERS.wh,
  year: FILTER_PARSERS.year,
})
const serializeModel = createSerializer({ model: FILTER_PARSERS.model })
const serializeHeld = createSerializer({
  heldfor: FILTER_PARSERS.heldfor,
  holdcustomer: FILTER_PARSERS.holdcustomer,
  cols: FILTER_PARSERS.cols,
  sort: FILTER_PARSERS.sort,
})

export function buildStoreListPath(warehouse: Warehouse | null): string {
  return buildStorePartsPathByWarehouseId(warehouse?.id ?? null)
}

export function buildStorePartsPathByWarehouseId(warehouseId: number | null): string {
  return serializeWarehouse(STORE_LIST_PATH, {
    warehouse: warehouseId === null ? null : [warehouseId],
  })
}

export function buildStorePartPath(partId: number, warehouseId: number): string {
  return serializeWarehouse(`${STORE_LIST_PATH}/${partId}`, { warehouse: [warehouseId] })
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

export function departedDrilldownHref(
  from: Date,
  to: Date,
  warehouses: Warehouse[],
  brand: Brand | null,
): string {
  return serializeDeparted(DEPARTED_PATH, {
    wh: warehouses.length > 0 ? warehouses.map((warehouse) => warehouse.id) : null,
    from,
    to,
    brand: brand?.id ?? null,
  })
}

export function modelPriceHistoryHref(modelId: number): string {
  return serializeModel(MODEL_PRICE_HISTORY_PATH, { model: modelId })
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
    cols: [...HELD_DRILLDOWN_COLUMN_IDS],
    sort: HELD_DRILLDOWN_SORT,
  })
}

export function buildProfitabilityReportPath(warehouse: Warehouse | null): string {
  return serializeProfitability(PROFITABILITY_REPORT_PATH, {
    wh: warehouse ? [warehouse.id] : null,
    year: getDefaultYear(),
  })
}

// The date filters default to a window ending today, so a link that omits them
// means "the last N days" to whoever opens it rather than the range the sender
// saw. Stamping the dates at build time keeps a copied link exact.
export function buildCollectionSummaryPath(path: string): string {
  return serializeDateRange(path, {
    from: getDefaultFromDate(DEFAULT_COLLECTION_RANGE_DAYS),
    to: getToday(),
  })
}

export function buildDepartedSearchPath(
  warehouse: Warehouse | null,
  assetType: AssetType | null,
): string {
  return serializeDepartedSearch(DEPARTED_PATH, {
    wh: warehouse ? [warehouse.id] : null,
    type: assetType ? [assetType.id] : null,
    from: getDefaultFromDate(DEFAULT_DEPARTED_RANGE_DAYS),
    to: getToday(),
  })
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
